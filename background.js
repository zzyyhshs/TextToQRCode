chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generate-qrcode",
    title: "生成二维码",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "decode-qrcode",
    title: "解析二维码",
    contexts: ["image"]
  });
});

// 鼠标悬停 canvas 时动态扩展解析菜单的上下文
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "canvasHover") {
    if (msg.over) {
      chrome.contextMenus.update("generate-qrcode", { visible: false });
      chrome.contextMenus.update("decode-qrcode", { contexts: ["all"] });
    } else {
      chrome.contextMenus.update("generate-qrcode", { visible: true });
      chrome.contextMenus.update("decode-qrcode", { contexts: ["image"] });
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generate-qrcode") {
    saveHistory(info.selectionText);
    await chrome.storage.local.set({ pendingQRText: info.selectionText });
    chrome.action.openPopup().catch(() => {});
  } else if (info.menuItemId === "decode-qrcode") {
    if (info.srcUrl) {
      await chrome.storage.local.set({ pendingDecodeUrl: info.srcUrl });
      chrome.action.openPopup().catch(() => {});
    } else if (tab) {
      await chrome.storage.local.set({ pendingCanvasTabId: tab.id });
      chrome.action.openPopup().catch(() => {});
    }
  }
});

async function saveHistory(text, type = "generate") {
  const { qrHistory = [] } = await chrome.storage.local.get("qrHistory");
  const idx = qrHistory.findIndex(item => item.text === text && item.type === type);
  if (idx !== -1) qrHistory.splice(idx, 1);
  qrHistory.unshift({ text, type, time: Date.now() });
  if (qrHistory.length > 50) qrHistory.length = 50;
  await chrome.storage.local.set({ qrHistory });
}
