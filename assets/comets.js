/* ==========================================================================
   Dola 彗星背景
   参考 spectr.to 的做法：canvas 里养一群「会拐弯的彗星」——
   每条彗星沿曲线飞行，拖一条按位置平方衰减的尾巴，头部再画一团径向辉光。
   这里把数量从 9 条加到 20~30 条（随屏宽），并垫了一层静态星点。
   - 用户开了「减少动态效果」时只画一帧静态画面；
   - 标签页隐藏时暂停，回来再继续；
   - 尺寸/DPR 变化时重建画布与星点。
   ========================================================================== */
(function () {
  'use strict';
  if (document.querySelector('.cosmos')) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 背景层的样式随脚本注入：这样不依赖 style.css 是否被当前页面加载
  // （例如指南页自带一套独立样式表）。
  var CSS =
    '.cosmos{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}' +
    '.cosmos>*{position:absolute;inset:0;pointer-events:none}' +
    '.cosmos-aurora{background:' +
      'radial-gradient(ellipse 80% 60% at 18% 22%,rgba(94,106,210,.16) 0%,transparent 62%),' +
      'radial-gradient(ellipse 70% 52% at 82% 74%,rgba(113,112,255,.11) 0%,transparent 60%),' +
      'radial-gradient(ellipse 62% 80% at 50% -6%,rgba(130,143,255,.16) 0%,transparent 58%);' +
      'animation:cosmos-breathe 16s ease-in-out infinite alternate}' +
    '@keyframes cosmos-breathe{0%{opacity:.65;transform:scale(1) rotate(0deg)}' +
      '50%{opacity:1;transform:scale(1.05) rotate(.6deg)}' +
      '100%{opacity:.82;transform:scale(1.02) rotate(-.3deg)}}' +
    '.cosmos-grid{background-image:repeating-linear-gradient(to right,transparent 0,' +
      'transparent calc(100%/12 - 1px),rgba(255,255,255,.018) calc(100%/12 - 1px),rgba(255,255,255,.018) calc(100%/12));' +
      '-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.55) 0%,transparent 72%);' +
      'mask-image:linear-gradient(180deg,rgba(0,0,0,.55) 0%,transparent 72%)}' +
    '.cosmos-noise{opacity:.032;background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");' +
      'background-repeat:repeat;background-size:96px 96px}' +
    '.cosmos-vignette{background:radial-gradient(ellipse 110% 90% at 50% 50%,transparent 44%,rgba(2,3,8,.62) 100%)}' +
    '.cosmos-floor{top:auto;height:280px;background:linear-gradient(0deg,rgba(2,3,8,.82) 0%,transparent 100%)}' +
    '.cosmos-canvas{opacity:0;animation:cosmos-in 2.6s ease .5s forwards}' +
    '@keyframes cosmos-in{to{opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.cosmos-canvas{animation:none;opacity:1}}';

  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);


  var root = document.createElement('div');
  root.className = 'cosmos';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="cosmos-aurora"></div>' +
    '<div class="cosmos-grid"></div>' +
    '<div class="cosmos-noise"></div>' +
    '<div class="cosmos-vignette"></div>' +
    '<div class="cosmos-floor"></div>' +
    '<canvas class="cosmos-canvas"></canvas>';
  document.body.insertBefore(root, document.body.firstChild);

  var canvas = root.querySelector('.cosmos-canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var PALETTE = ['113,112,255', '130,143,255', '94,106,210', '160,170,255', '180,192,255', '143,156,255'];
  var TRAIL = 56;       // 尾巴最多保留多少采样点
  var W = 0, H = 0, dpr = 1;
  var comets = [];
  var starLayer = null;  // 离屏星点，避免每帧重画
  var raf = 0;

  function cometCount() {
    var n = Math.round(window.innerWidth / 46);
    if (n < 12) n = 12;
    if (n > 34) n = 34;
    return n;
  }

  function spawn(w, h) {
    var x, y, ang;
    switch (Math.floor(4 * Math.random())) {
      case 0:
        x = Math.random() * w; y = -20;
        ang = 0.3 * Math.PI + Math.random() * 0.4 * Math.PI;
        break;
      case 1:
        x = w + 20; y = Math.random() * h;
        ang = Math.PI + (Math.random() - 0.5) * 0.8;
        break;
      case 2:
        x = Math.random() * w; y = h + 20;
        ang = -(0.3 * Math.PI) - Math.random() * 0.4 * Math.PI;
        break;
      default:
        x = -20; y = Math.random() * h;
        ang = (Math.random() - 0.5) * 0.8;
    }
    var speed = 0.35 + 1.0 * Math.random();
    return {
      x: x,
      y: y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      curve: (Math.random() - 0.5) * 0.004,
      trail: [],
      hue: PALETTE[(Math.random() * PALETTE.length) | 0],
      alpha: 0.18 + 0.28 * Math.random(),
      width: 1.1 + 2.6 * Math.random(),
      life: 0,
      maxLife: 480 + 540 * Math.random()
    };
  }

  function step(c) {
    c.life++;
    var cs = Math.cos(c.curve), sn = Math.sin(c.curve);
    var vx = c.vx * cs - c.vy * sn;
    c.vy = c.vx * sn + c.vy * cs;
    c.vx = vx;
    c.x += c.vx;
    c.y += c.vy;
    c.trail.push({ x: c.x, y: c.y });
    if (c.trail.length > TRAIL) c.trail.shift();
  }

  function outOfStage(c) {
    return c.life >= c.maxLife ||
      c.x < -180 || c.x > W + 180 ||
      c.y < -180 || c.y > H + 180;
  }

  function buildStars() {
    var layer = document.createElement('canvas');
    layer.width = Math.max(1, Math.round(W * dpr));
    layer.height = Math.max(1, Math.round(H * dpr));
    var sctx = layer.getContext('2d');
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.min(240, Math.round((W * H) / 13000));
    for (var i = 0; i < count; i++) {
      var x = Math.random() * W;
      var y = Math.random() * H;
      var r = 0.3 + Math.random() * 1.0;
      var a = 0.10 + Math.random() * 0.34;
      sctx.beginPath();
      sctx.arc(x, y, r, 0, Math.PI * 2);
      sctx.fillStyle = 'rgba(214,224,255,' + a.toFixed(3) + ')';
      sctx.fill();
    }
    starLayer = layer;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars();
    comets = [];
    var n = cometCount();
    for (var i = 0; i < n; i++) {
      var c = spawn(W, H);
      // 一部分彗星生成时就「已经飞了一会儿」，首屏不至于是空的
      var warm = Math.floor(Math.random() * c.maxLife * 0.5);
      for (var k = 0; k < warm; k++) step(c);
      comets.push(c);
    }
  }

  function drawComet(c) {
    var len = c.trail.length;
    if (len < 3) return;
    var progress = c.life / c.maxLife;
    var fade = progress < 0.12 ? progress / 0.12
             : progress > 0.78 ? (1 - progress) / 0.22
             : 1;

    for (var i = 1; i < len; i++) {
      var a = i / len;
      var alpha = c.alpha * fade * a * a;   // 尾巴按位置平方衰减：头亮尾淡
      if (alpha < 0.004) continue;
      ctx.beginPath();
      ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
      ctx.lineTo(c.trail[i].x, c.trail[i].y);
      ctx.strokeStyle = 'rgba(' + c.hue + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = c.width * a;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 头部的径向辉光
    var glowA = c.alpha * fade * 0.55;
    var radius = 4.5 * c.width;
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
    g.addColorStop(0, 'rgba(' + c.hue + ',' + glowA.toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(' + c.hue + ',' + (glowA * 0.35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + c.hue + ',0)');
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    if (starLayer) ctx.drawImage(starLayer, 0, 0, W, H);
    for (var i = 0; i < comets.length; i++) drawComet(comets[i]);
  }

  function loop() {
    for (var i = 0; i < comets.length; i++) {
      var c = comets[i];
      step(c);
      if (outOfStage(c)) comets[i] = spawn(W, H);
    }
    drawFrame();
    raf = requestAnimationFrame(loop);
  }

  resize();

  if (reduced) {
    drawFrame();                 // 静态一帧：彗星停在半空，像一张海报
  } else {
    raf = requestAnimationFrame(loop);
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduced) drawFrame();
    }, 160);
  });

  document.addEventListener('visibilitychange', function () {
    if (reduced) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(loop);
    }
  });
})();
