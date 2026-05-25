# Text to QR Code

Chrome 扩展：在网页中快速生成与解析二维码。

## 功能

- **生成二维码**：在网页中选中文字后，通过右键菜单生成二维码
- **解析二维码**：右键解析图片或 Canvas 中的二维码内容
- **自定义样式**：支持自定义颜色、尺寸、边距、容错等级
- **Logo 叠加**：可在二维码中心叠加 Logo

## 安装

### Chrome 网上应用店（推荐）

[在 Chrome 网上应用店安装](https://chromewebstore.google.com/detail/text-to-qr-code/jnconlfkpgdoicapobgdcgionnmmmbpj)

### 本地加载（开发者模式）

1. 克隆本仓库
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目根目录

## 使用说明

### 生成二维码

1. 在任意网页中用鼠标选中一段文字
2. 右键选择生成二维码相关菜单项
3. 在弹出面板中调整颜色、尺寸、边距、容错等级等，可选叠加 Logo
4. 保存或复制生成的二维码

### 解析二维码

1. 在包含二维码的图片或 Canvas 上右键
2. 选择解析二维码
3. 查看解析出的文本内容

## 项目结构

```
TextToQRCode/
├── manifest.json      # 扩展清单（Manifest V3）
├── background.js      # 后台 Service Worker（右键菜单等）
├── content.js         # 内容脚本（页面内生成/解析）
├── content.css        # 内容脚本样式
├── popup.html/js      # 扩展弹窗
└── lib/               # qrcode.min.js、jsqr.min.js
```

## 技术栈

- Chrome Extension Manifest V3
- [qrcode](https://github.com/soldair/node-qrcode)（生成）
- [jsQR](https://github.com/cozmo/jsQR)（解析）

## 许可证

请根据仓库实际情况补充许可证信息。
