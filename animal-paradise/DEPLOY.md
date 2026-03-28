# 部署指南

## 🚀 快速部署

### 方法 1: GitHub Pages（推荐）

1. 创建 GitHub 仓库
2. 上传所有文件
3. 进入仓库 → Settings → Pages
4. 选择 `main` 分支，保存
5. 访问 `https://你的用户名.github.io/仓库名`

### 方法 2: Vercel（零配置）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
cd /Users/tom/.openclaw/workspace/animal-paradise
vercel
```

### 方法 3: Netlify

1. 访问 https://app.netlify.com/drop
2. 拖拽整个 `animal-paradise` 文件夹
3. 完成部署

### 方法 4: 本地服务器

```bash
# Python
python3 -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

## 📱 PWA 安装

### 手机用户
1. 打开网站
2. 点击"安装应用到手机"提示
3. 或手动：浏览器菜单 → "添加到主屏幕"

### 桌面用户
1. 打开网站
2. 浏览器地址栏右侧会出现安装图标
3. 点击安装

## 🔧 自定义配置

### 修改位置
编辑 `app.js` 中的 `loadWeather()` 函数：
```javascript
const lat = 你的纬度;  // 例如：31.2304
const lon = 你的经度;  // 例如：121.4737
```

获取坐标：https://www.latlong.net/

### 修改 API
- 天气 API: 默认使用 Open-Meteo（免费）
- 名言 API: 默认使用 Quotable.io

### 添加新动物
在 `app.js` 的 `animals` 数组中添加：
```javascript
{
  id: 'new-animal',
  name: '新动物',
  emoji: '🐾',
  description: '动物描述',
  render: () => `你的 CSS HTML`
}
```

## 🌐 域名绑定（可选）

### Vercel
1. 项目设置 → Domains
2. 添加自定义域名
3. 按提示配置 DNS

### Netlify
1. 项目设置 → Domain management
2. 添加自定义域名
3. 配置 DNS

## 📊 分析统计（可选）

添加 Google Analytics 到 `index.html` 的 `<head>`：
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=你的 ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '你的 ID');
</script>
```

## 🔒 安全性

- 所有 API 都是公开的，无需密钥
- 无后端依赖，纯静态网站
- 支持 HTTPS
- Service Worker 缓存提升性能

## 📈 性能优化

### 已优化
- ✅ 零图片资源（纯 CSS）
- ✅ 最小化 HTTP 请求
- ✅ Service Worker 缓存
- ✅ 响应式设计

### 可选优化
```bash
# 压缩 CSS
npm install -g clean-css-cli
cleancss -o styles.min.css styles.css

# 压缩 JS
npm install -g uglify-js
uglifyjs app.js -o app.min.js

# 修改 index.html 引用
<link rel="stylesheet" href="styles.min.css">
<script src="app.min.js"></script>
```

## 🎯 SEO 优化

已包含：
- ✅ 语义化 HTML
- ✅ Meta 描述
- ✅ Open Graph 标签
- ✅ Twitter Card
- ✅ 结构化数据

可添加：
```html
<!-- 在 <head> 中添加 -->
<meta property="og:title" content="动物乐园 - 每日惊喜">
<meta property="og:description" content="用纯 CSS 绘制的动物世界">
<meta property="og:image" content="预览图 URL">
<meta property="og:url" content="网站 URL">
```

## 📱 社交媒体分享

网站支持原生分享 API，自动适配：
- 微信
- QQ
- 微博
- Twitter
- Facebook

## 🆘 故障排除

### PWA 无法安装
- 确保使用 HTTPS
- 检查 manifest.json 是否存在
- 确保 Service Worker 注册成功

### 天气不显示
- 检查网络连接
- 确认 API 可用（Open-Meteo）
- 查看浏览器控制台错误

### 音乐无法播放
- 浏览器需要用户交互才能播放
- 先点击页面任意位置
- 然后按 M 键或点击音乐按钮

## 📞 技术支持

遇到问题？
- 查看控制台错误信息
- 检查网络请求
- 确认浏览器支持（需要现代浏览器）

---

**祝你部署顺利！** 🎉
