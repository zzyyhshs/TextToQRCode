// 记录右键点击的元素
let lastRightClickedElement = null;
document.addEventListener("contextmenu", (e) => {
  lastRightClickedElement = e.target.closest("canvas") || e.target;
});

// 鼠标悬停 canvas 时通知 background 扩展菜单上下文
let isOverCanvas = false;
function onMouseOver(e) {
  try {
    const over = !!e.target.closest("canvas");
    if (over !== isOverCanvas) {
      isOverCanvas = over;
      chrome.runtime.sendMessage({ action: "canvasHover", over }).catch(() => {});
    }
  } catch {
    document.removeEventListener("mouseover", onMouseOver);
  }
}
document.addEventListener("mouseover", onMouseOver);

// 监听来自 background/popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "showQRCode") {
    showQRCodePopup(message.text);
  } else if (message.action === "getCanvasData") {
    const el = lastRightClickedElement;
    const canvas = el && (el.tagName === "CANVAS" ? el : el.closest("canvas"));
    if (canvas) {
      try {
        sendResponse(canvas.toDataURL());
      } catch {
        sendResponse(null);
      }
    } else {
      sendResponse(null);
    }
    return true;
  }
});


function showQRCodePopup(text) {
  // 移除已有弹窗
  const existing = document.getElementById("qr-popup-host");
  if (existing) existing.remove();

  // 创建 Shadow DOM 宿主
  const host = document.createElement("div");
  host.id = "qr-popup-host";
  host.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "closed" });

  const previewText = text.length > 100 ? text.substring(0, 100) + "..." : text;

  shadow.innerHTML = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      .overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .popup {
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        min-width: 260px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      .close {
        cursor: pointer;
        font-size: 22px;
        color: #999;
        line-height: 1;
      }
      .close:hover { color: #333; }
      .qr-container {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }
      .qr-container canvas {
        display: none !important;
      }
      .qr-container img {
        display: block !important;
      }
      .text-preview {
        margin-top: 12px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 6px;
        font-size: 12px;
        color: #666;
        word-break: break-all;
        max-height: 60px;
        overflow: hidden;
        text-align: center;
      }
    </style>
    <div class="overlay">
      <div class="popup">
        <div class="header">
          <span>二维码</span>
          <span class="close">&times;</span>
        </div>
        <div class="qr-container"></div>
        <div class="text-preview">${previewText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    </div>
  `;

  const overlay = shadow.querySelector(".overlay");
  const qrContainer = shadow.querySelector(".qr-container");
  const closeBtn = shadow.querySelector(".close");

  closeBtn.addEventListener("click", () => host.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) host.remove();
  });

  document.body.appendChild(host);

  // 生成二维码
  new QRCode(qrContainer, {
    text: text,
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.M
  });
}
