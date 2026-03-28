// 动物数据
let currentAnimalIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let isMusicPlaying = false;
let audioContext = null;
let oscillator = null;
let gainNode = null;

const animals = [
  {
    id: 'cat',
    name: '三花猫',
    emoji: '🐱',
    description: '三花猫是一种拥有三种颜色的猫咪，通常是白色、黑色和橙色。它们大多数都是母猫，性格温顺可爱，是非常受欢迎的宠物。',
    render: () => `
      <div class="cat">
        <div class="cat-head">
          <div class="cat-ear left"></div>
          <div class="cat-ear right"></div>
          <div class="cat-eye left"></div>
          <div class="cat-eye right"></div>
          <div class="cat-nose"></div>
          <div class="cat-mouth"></div>
          <div class="cat-whisker l1"></div>
          <div class="cat-whisker l2"></div>
          <div class="cat-whisker l3"></div>
          <div class="cat-whisker r1"></div>
          <div class="cat-whisker r2"></div>
          <div class="cat-whisker r3"></div>
          <div class="cat-spot1"></div>
          <div class="cat-spot2"></div>
          <div class="cat-spot3"></div>
        </div>
      </div>
    `
  },
  {
    id: 'horse',
    name: '骏马',
    emoji: '🐴',
    description: '马是忠诚、勇敢的象征。它们奔跑时英姿飒爽，代表着自由和力量。在中国文化中，马也象征着成功和前进。',
    render: () => `
      <div class="horse">
        <div class="horse-body"></div>
        <div class="horse-neck"></div>
        <div class="horse-head">
          <div class="horse-ear left"></div>
          <div class="horse-ear right"></div>
          <div class="horse-eye"></div>
          <div class="horse-nose"></div>
        </div>
        <div class="horse-man"></div>
        <div class="horse-leg fl"></div>
        <div class="horse-leg fr"></div>
        <div class="horse-leg bl"></div>
        <div class="horse-leg br"></div>
      </div>
    `
  },
  {
    id: 'dog',
    name: '忠犬',
    emoji: '🐶',
    description: '狗是人类最忠诚的朋友。它们聪明、忠诚、热情，总是无条件地爱着主人。',
    render: () => `
      <div class="dog">
        <div class="dog-head">
          <div class="dog-ear left"></div>
          <div class="dog-ear right"></div>
          <div class="dog-eye left"></div>
          <div class="dog-eye right"></div>
          <div class="dog-nose"></div>
          <div class="dog-mouth"></div>
          <div class="dog-tongue"></div>
        </div>
      </div>
    `
  }
];

// 十二生肖数据
const zodiacs = [
  { name: '鼠', emoji: '🐭', luck: '大吉' },
  { name: '牛', emoji: '🐮', luck: '中吉' },
  { name: '虎', emoji: '🐯', luck: '小吉' },
  { name: '兔', emoji: '🐰', luck: '大吉' },
  { name: '龙', emoji: '🐲', luck: '吉' },
  { name: '蛇', emoji: '🐍', luck: '中吉' },
  { name: '马', emoji: '🐴', luck: '小吉' },
  { name: '羊', emoji: '🐑', luck: '吉' },
  { name: '猴', emoji: '🐵', luck: '大吉' },
  { name: '鸡', emoji: '🐔', luck: '中吉' },
  { name: '狗', emoji: '🐶', luck: '小吉' },
  { name: '猪', emoji: '🐷', luck: '吉' }
];

// 备用名言列表
const backupQuotes = [
  { text: '生活不是等待风暴过去，而是学会在雨中跳舞。', author: '未知' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '最好的时光，就是你喜欢我，我也喜欢你。', author: '未知' },
  { text: '愿你被这个世界温柔以待。', author: '未知' },
  { text: '心中有光，何惧路长。', author: '未知' }
];

// 生成柔和的背景音乐（使用 Web Audio API）
function playAmbientMusic() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  // 创建多个振荡器生成和弦
  const frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4 (C大调和弦)
  
  frequencies.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.value = 0.05;
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    
    // 存储引用以便停止
    if (!window.activeOscillators) {
      window.activeOscillators = [];
    }
    window.activeOscillators.push({ osc, gain });
  });
}

function stopAmbientMusic() {
  if (window.activeOscillators) {
    window.activeOscillators.forEach(({ osc, gain }) => {
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      setTimeout(() => osc.stop(), 500);
    });
    window.activeOscillators = [];
  }
}

// 音乐控制
function toggleMusic() {
  if (isMusicPlaying) {
    stopAmbientMusic();
    document.getElementById('musicControl').classList.remove('playing');
  } else {
    playAmbientMusic();
    document.getElementById('musicControl').classList.add('playing');
  }
  isMusicPlaying = !isMusicPlaying;
}

// 更新日期
function updateDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('zh-CN', options);
}

// 更新时间
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = timeStr;
}

// 加载天气
async function loadWeather() {
  const weatherEl = document.getElementById('weatherInfo');
  weatherEl.textContent = '加载中...';
  
  try {
    // 默认位置：上海
    const lat = 31.2304;
    const lon = 121.4737;
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await response.json();
    
    const temp = data.current_weather.temperature;
    const weatherCode = data.current_weather.weathercode;
    
    let weatherDesc = '晴';
    if (weatherCode > 0 && weatherCode <= 3) weatherDesc = '多云';
    else if (weatherCode <= 48) weatherDesc = '阴';
    else if (weatherCode <= 67) weatherDesc = '雨';
    else if (weatherCode <= 82) weatherDesc = '大雨';
    else if (weatherCode <= 99) weatherDesc = '雷暴';
    
    weatherEl.textContent = `${weatherDesc} ${temp}°C`;
  } catch (error) {
    console.error('天气加载失败:', error);
    weatherEl.textContent = '暂无数据';
  }
}

// 加载名言
async function loadQuote() {
  const quoteEl = document.getElementById('dailyQuote');
  quoteEl.textContent = '加载中...';
  
  try {
    const response = await fetch('https://quotable.io/random');
    if (!response.ok) throw new Error('API 失败');
    const data = await response.json();
    quoteEl.textContent = `"${data.content}" — ${data.author}`;
  } catch (error) {
    console.log('使用备用名言');
    const randomQuote = backupQuotes[Math.floor(Math.random() * backupQuotes.length)];
    quoteEl.textContent = `"${randomQuote.text}" — ${randomQuote.author}`;
  }
}

// 加载生肖
function loadZodiac() {
  const today = new Date();
  const year = today.getFullYear();
  
  // 计算生肖（地支）
  const zodiacIndex = (year - 4) % 12;
  const zodiac = zodiacs[zodiacIndex];
  
  document.getElementById('zodiacToday').textContent = `${zodiac.emoji} ${zodiac.name}年 (${zodiac.luck})`;
}

// 显示动物
function showAnimal(index) {
  currentAnimalIndex = index;
  const animal = animals[index];
  
  document.getElementById('animalName').textContent = `今日主角：${animal.emoji} ${animal.name}`;
  document.getElementById('animalStage').innerHTML = animal.render();
  document.getElementById('animalInfo').innerHTML = `
    <p>${animal.description}</p>
    <div class="animal-emoji">${animal.emoji}</div>
  `;
}

// 下一只动物
function showNextAnimal() {
  const nextIndex = (currentAnimalIndex + 1) % animals.length;
  showAnimal(nextIndex);
}

// 切换自动播放
function toggleAutoPlay() {
  const btn = event.target;
  
  if (isAutoPlaying) {
    clearInterval(autoPlayInterval);
    isAutoPlaying = false;
    btn.textContent = '⏯️ 自动播放';
  } else {
    autoPlayInterval = setInterval(showNextAnimal, 5000);
    isAutoPlaying = true;
    btn.textContent = '⏸️ 暂停播放';
  }
}

// 刷新所有数据
function refreshAll() {
  updateDate();
  updateTime();
  loadWeather();
  loadQuote();
  loadZodiac();
  
  // 显示刷新动画
  const infoCards = document.querySelectorAll('.info-card');
  infoCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.transform = 'scale(1.05)';
      setTimeout(() => {
        card.style.transform = '';
      }, 200);
    }, index * 100);
  });
}

// 分享功能
function shareAnimal() {
  const animal = animals[currentAnimalIndex];
  const shareData = {
    title: '动物乐园 - ' + animal.name,
    text: `今天我在动物乐园看到了${animal.emoji} ${animal.name}！这是一个纯 CSS 绘制的奇妙世界，快来看看：`,
    url: window.location.href
  };
  
  if (navigator.share) {
    navigator.share(shareData)
      .then(() => {
        showToast('分享成功！');
      })
      .catch((err) => {
        console.log('分享取消或失败:', err);
      });
  } else {
    navigator.clipboard.writeText(shareData.text + ' ' + shareData.url)
      .then(() => {
        showToast('链接已复制到剪贴板！');
      })
      .catch(err => {
        showToast('分享失败，请手动复制链接');
      });
  }
}

// 显示提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'share-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// 创建背景形状
function createBgShapes() {
  const container = document.getElementById('bgShapes');
  const shapes = ['🐱', '🐶', '🐴', '🐷', '🐲', '⭐', '🌸', '🍃'];
  
  for (let i = 0; i < 15; i++) {
    const shape = document.createElement('div');
    shape.className = 'bg-shape';
    shape.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    shape.style.left = Math.random() * 100 + '%';
    shape.style.top = Math.random() * 100 + '%';
    shape.style.fontSize = (Math.random() * 20 + 10) + 'px';
    shape.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(shape);
  }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    showNextAnimal();
  } else if (e.key === 'ArrowLeft') {
    const prevIndex = (currentAnimalIndex - 1 + animals.length) % animals.length;
    showAnimal(prevIndex);
  } else if (e.key === 'r' || e.key === 'R') {
    refreshAll();
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMusic();
  }
});

// 初始化
window.addEventListener('load', () => {
  updateDate();
  updateTime();
  loadWeather();
  loadQuote();
  loadZodiac();
  showAnimal(currentAnimalIndex);
  createBgShapes();
  
  setInterval(updateTime, 1000);
});
