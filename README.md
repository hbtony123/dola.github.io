# dola.cn

纯静态站点，没有框架、没有构建步骤。上传整个目录即可运行。

## 目录结构

```
index.html      首页
works.html      作品
notes.html      笔记
about.html      关于
notes/          长文与解法文（笔记区里带「读全文」的文章）
guide/          Codex 使用指南（单文件长文，独立视觉）
tools/          可以直接下载的小工具脚本
scripts/        早期页面留下的音频与脚本，与本站无关
404.html        找不到页面时的落地页
assets/style.css  全部样式（含深色模式）
assets/favicon.svg
CNAME           GitHub Pages 自定义域名，内容必须是 dola.cn
.nojekyll       让 Pages 跳过 Jekyll 处理
robots.txt / sitemap.xml
```

## 维护约定

- **改颜色、间距、字号**：只动 `assets/style.css` 顶部的变量，不要把颜色写进页面里。
- **加一篇笔记**：复制 `notes.html` 里任意一个 `<article class="note">`，改日期与正文，插入到第一个条目之前；
  再跑 `python3 scripts/paginate-notes.py`，把列表按每页 10 条重新分页（会自动生成 `notes-N.html`、删除多余页）。
  顺序是从新到旧。
- **加一个作品**：复制 `works.html` 里的 `<article class="work">`，状态标签写清楚当前进度。
- **导航高亮**：当前页面的导航项加 `aria-current="page"`。
- **动画**：入场的淡入靠 `data-reveal`，用 `style="--d:.2s"` 控制先后顺序。系统开启「减少动态效果」时自动关闭。
- **新增页面后**：更新 `sitemap.xml`，并在需要时给其他页面的导航加上入口。
- **页脚年份**：每年年初记得改 `© 2026`。

## 上线（现状）

`dola.cn` = GitHub Pages，源仓库 **`hbtony123/dola.github.io`**，分支 `main`。
解析：`dola.cn` 用 4 条 A 记录指向 GitHub Pages（见下文表格），NS 在阿里云。

发布工具不在本站目录里（它维护着远端的一份镜像克隆，所以只会快进、不会覆盖别人推上去的提交）。
在维护机上只需要这两条命令：

```bash
bash ~/CODEX/.dola-deploy/deploy.sh --dry-run   # 彩排：只列出这次会动哪些文件
bash ~/CODEX/.dola-deploy/deploy.sh             # 真发布
```

脚本流程：探测并选定 SSH 通道 → 更新镜像（浅克隆、只允许快进）→ 拷贝本站文件 →
删除已废弃项目 → 提交推送（失败自动重试 5 次）→ **逐个核对本次改动过的文件**是否已在线上生效。

判断成功不看命令有没有报错，看结果：线上文件与本地文件忽略空白后哈希一致，才算发布成功。
脚本只核验「这一次真正改动的文件」——核验一个没有改动的页面，什么也证明不了。

三个已经踩过的坑，别再踩（前两条发生在上一台维护机上，留着是为了认症状）：

- **`github.com` 被本地代理接管**（解析到 `127.0.0.1`）：此时任何密钥都会「认证成功」，
  看着像通了，其实推不动真东西。判断方法很便宜：拿一把注定不该成功的密钥去试，看它是不是也回「认证成功」。
  现在的维护机没有这个问题，22 端口直连即可；脚本仍保留自动回落到
  `ssh://git@ssh.github.com:443/hbtony123/dola.github.io.git` 的能力，通道不通时会自己切过去。
- **完整克隆会卡死**（包协商之后 0 字节不动），必须用 `--depth 1` 浅克隆，几秒就能拉下来。
- **网络时断时续是常态**，脚本内置 5 次重试；判断是否成功要看 dola.cn 是否真的返回新内容，而不是看命令有没有报错。

仓库里必须留意的文件：

- 根目录 `CNAME` 内容必须是 `dola.cn`，删了自定义域名就掉。
- `.nojekyll` 别删：它让 Pages 跳过 Jekyll 处理。
- `scripts/` 是旧页面留下的音频与脚本，跟本站无关，不要动。
- `animal-paradise/`（动物乐园）已于 2026-10-16 删除，需要时可在历史提交里找回。
- 本文件（`README.md`）会随站点一起发布——**不要在里面写凭据或内部地址**。

样式没更新一般是缓存，强制刷新一次即可。

本地预览：直接双击 `index.html` 就能看，整站没有外部依赖。

通道彻底不通时的备用方案：`.dola-deploy/publish.ps1` 走 GitHub API 发布（需要一把限权到该仓库的令牌）。
它是上一台维护机上留下的脚本，**没有搬到现在的机器**；现在主要依赖上面那条自动回落。

## 域名与解析（2026-10-16 起）

解析在阿里云云解析，NS 是 `dns21.hichina.com` / `dns22.hichina.com`。

| 名字 | 类型 | 值 | 用途 |
| --- | --- | --- | --- |
| `@` | A ×4 | `185.199.108.153`、`.109.153`、`.110.153`、`.111.153` | GitHub Pages 站点 |
| `www` | CNAME | `hbtony123.github.io` | 跳主域名 |
| `_github-pages-challenge-hbtony123` | TXT | `4e82c4cf…dd6` | GitHub 域名验证，**别删** |
| `@` | MX ×3 | `mx1.qiye.aliyun.com`(5)、`mx2`(10)、`mx3`(15) | 阿里邮箱收信 |
| `@` | TXT | `v=spf1 include:spf.qiye.aliyun.com -all` | 发信防伪造 |

两个已经踩过的坑：

- 顶点原先是一条 CNAME。**CNAME 与 MX/TXT 互斥**，所以加邮箱记录之前必须先删掉它、换成上面那 4 条 A 记录，否则邮箱记录写不进去。
- 原先还有一条 `*` 通配符 CNAME 指向 github.io。它会把 `mail._domainkey`、`_dmarc` 这类名字一并接管，导致 DKIM / DMARC 永远配不上。已于 2026-10-16 删除，**不要加回来**。

邮箱：`hello@dola.cn`，阿里邮箱免费版，管理员账号 `codex`。
免费版不提供 DKIM 记录，所以主动发信到 QQ / Gmail 有进垃圾箱的风险，收信不受影响。

## 运营与数据

- **最省事的统计**：GitHub 仓库自带的流量面板（仓库 → Insights → Traffic），不用装任何东西，
  能看最近 14 天的访问量与来源站，登录即用。先看这个就够。
- **要看页面级数据**，再任选一种（都需要注册账号，注册后把那段脚本贴到各页 `</head>` 前，再跑一次 `deploy.sh`）：
  Cloudflare Web Analytics（免费、不采集个人信息，最贴合本站调性）、百度统计（国内数据最全）、
  GoatCounter / Umami（开源，可自建）。
- **提交搜索引擎**（一次性，都需要账号）：
  - Google Search Console：添加「网址前缀」资源 `https://dola.cn/`，把验证文件放进站点根目录
    （发布脚本会一起发上去，记得把文件名加进脚本里的同步清单），然后提交 `sitemap.xml`
  - Bing Webmaster：可直接从 GSC 导入，同样提交 sitemap
  - 百度搜索资源平台：添加站点 → 文件或 CNAME 验证 → 提交 sitemap
- **订阅入口**：站上「发信到 hello@dola.cn，主题写订阅」。读者来信用邮件工具读、用邮件工具回
  （工具脚本与凭据都还在上一台机器上，见「待办」）。
- **分发**：内容去 V2EX（分享创造）、掘金、知乎、少数派；英文版投 Hacker News。
  别整篇复制——按平台改写标题和开头，读者不同，重复内容对自己也没好处。

## 待办

- 邮件工具：现维护机上还没有可用的收发脚本。重做时把密码存进系统钥匙串，不要再抄旧的加密文件。
- DKIM / DMARC：当前只有 SPF。可选加一条 `_dmarc` 的 TXT（`v=DMARC1; p=none; rua=mailto:hello@dola.cn`）先做监控。
- 可选：站内搜索、订阅、站点访问统计（如需，另开分支）。
