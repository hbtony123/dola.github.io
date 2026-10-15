# dola.cn

纯静态站点，没有框架、没有构建步骤。上传整个目录即可运行。

## 目录结构

```
index.html      首页
works.html      作品
notes.html      笔记
about.html      关于
assets/style.css  全部样式（含深色模式）
assets/favicon.svg
robots.txt / sitemap.xml
```

## 维护约定

- **改颜色、间距、字号**：只动 `assets/style.css` 顶部的变量，不要把颜色写进页面里。
- **加一篇笔记**：复制 `notes.html` 里任意一个 `<article class="note">`，改日期与正文。
  顺序是从新到旧，新条目放在最前面。
- **加一个作品**：复制 `works.html` 里的 `<article class="work">`，状态标签写清楚当前进度。
- **导航高亮**：当前页面的导航项加 `aria-current="page"`。
- **动画**：入场的淡入靠 `data-reveal`，用 `style="--d:.2s"` 控制先后顺序。系统开启「减少动态效果」时自动关闭。
- **新增页面后**：更新 `sitemap.xml`，并在需要时给其他页面的导航加上入口。
- **页脚年份**：每年年初记得改 `© 2026`。

## 上线（现状）

`dola.cn` = GitHub Pages，源仓库 **`hbtony123/dola.github.io`**，分支 `main`。
域名解析：`dola.cn` → CNAME → `hbtony123.github.io`，NS 在阿里云。

发布只需要一条命令（工具在 `D:\CODEX\.dola-deploy\`，不属于本站内容）：

```powershell
powershell -ExecutionPolicy Bypass -File D:\CODEX\.dola-deploy\deploy.ps1
```

脚本流程：浅克隆／更新镜像 → 拷贝本站文件 → 删除废弃项目 → 提交推送（自带重试）→ 等 dola.cn 真的返回新页面。

三个已经踩过的坑，别再踩：

- **本机的 `github.com` 被本地代理接管**（解析到 `127.0.0.1`）：此时任何密钥都会「认证成功」，看着像通了，其实推不动真东西。真实入口是 GitHub 的 SSH-over-443：`ssh://git@ssh.github.com:443/hbtony123/dola.github.io.git`。
- **完整克隆会卡死**（包协商之后 0 字节不动），必须用 `--depth 1` 浅克隆，几秒就能拉下来。
- **网络时断时续是常态**，脚本内置 5 次重试；判断是否成功要看 dola.cn 是否真的返回新内容，而不是看命令有没有报错。

仓库里必须留意的文件：

- 根目录 `CNAME` 内容必须是 `dola.cn`，删了自定义域名就掉。
- `scripts/` 是旧页面留下的音频与脚本，跟本站无关，不要动。
- `animal-paradise/`（动物乐园）已于 2026-10-16 删除，需要时可在历史提交里找回。

样式没更新一般是缓存，强制刷新一次即可。

本地预览：直接双击 `index.html` 就能看，整站没有外部依赖。

备选通道：`.dola-deploy\publish.ps1` 走 GitHub API 发布（需要一把限权到该仓库的令牌，放在同目录 `token.txt`），当 SSH 通道彻底不通时可用。

## 待办

- 邮箱：`dola.cn` 目前没有 MX 记录，`hello@dola.cn` 收不到信，所以站内的联系方式先用 GitHub。
  配好企业邮箱或邮件转发之后，把 4 个页面页脚里的 GitHub 链接换成邮箱即可。
- Codex 使用指南整理好后，放进本站并加上入口。
- 可选：站内搜索、订阅、站点访问统计（如需，另开分支）。
