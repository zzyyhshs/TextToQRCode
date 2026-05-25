const qrBox = document.getElementById("qr-box");
const historyList = document.getElementById("history-list");
const inputText = document.getElementById("input-text");
const decodeResult = document.getElementById("decode-result");
const resultArea = document.getElementById("result-area");
const toggleBtn = document.getElementById("toggle-history");

toggleBtn.addEventListener("click", () => {
  const collapsed = historyList.classList.toggle("collapsed");
  toggleBtn.innerHTML = collapsed ? "\u25BC 展开" : "\u25B2 收起";
});

// Tab 切换
document.querySelector(".tab-bar").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab-bar .tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
});

// 颜色设置
const colorFg = document.getElementById("color-fg");
const colorBg = document.getElementById("color-bg");

chrome.storage.local.get(["qrColorFg", "qrColorBg"]).then(({ qrColorFg, qrColorBg }) => {
  if (qrColorFg) colorFg.value = qrColorFg;
  if (qrColorBg) colorBg.value = qrColorBg;
});

colorFg.addEventListener("input", onColorChange);
colorBg.addEventListener("input", onColorChange);

document.getElementById("reset-all").addEventListener("click", () => {
  colorFg.value = "#000000";
  colorBg.value = "#ffffff";
  correctLevel = "M";
  document.querySelectorAll(".level-option").forEach(el => el.classList.toggle("active", el.dataset.level === "M"));
  qrSize = 200;
  sizeInput.value = 200;
  sizeInput.max = 400;
  sizeMaxInput.value = 400;
  sizeCur.textContent = "200px";
  qrMargin = 10;
  marginInput.value = 10;
  marginInput.max = 20;
  marginMaxInput.value = 20;
  marginCur.textContent = "10px";
  chrome.storage.local.set({ qrColorFg: "#000000", qrColorBg: "#ffffff", qrLevel: "M", qrSize: 200, qrMargin: 10, qrSizeMax: 400, qrMarginMax: 20 });
  refreshQR();
});

// Logo 设置
const logoList = document.getElementById("logo-list");
const dropZone = document.getElementById("logo-drop-zone");
let selectedLogo = null;
let logos = [];

function renderLogos() {
  logoList.innerHTML = "";
  const none = document.createElement("div");
  none.className = "logo-item" + (selectedLogo === null ? " active" : "");
  none.innerHTML = '<span class="logo-none">无</span>';
  none.addEventListener("click", () => { selectedLogo = null; chrome.storage.local.set({ selectedLogo: null }); renderLogos(); refreshQR(); });
  logoList.appendChild(none);
  logos.forEach((dataUrl, i) => {
    const item = document.createElement("div");
    item.className = "logo-item" + (selectedLogo === i ? " active" : "");
    item.innerHTML = `<img src="${dataUrl}"><span class="del-logo">&times;</span>`;
    item.querySelector("img").addEventListener("click", () => { selectedLogo = i; chrome.storage.local.set({ selectedLogo: i }); renderLogos(); refreshQR(); });
    item.querySelector(".del-logo").addEventListener("click", (e) => { e.stopPropagation(); logos.splice(i, 1); if (selectedLogo === i) { selectedLogo = null; } else if (selectedLogo > i) { selectedLogo--; } chrome.storage.local.set({ qrLogos: logos, selectedLogo }); renderLogos(); refreshQR(); });
    logoList.appendChild(item);
  });
}

function compressImage(file, maxSize = 128) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function addLogoFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  dropZone.textContent = "正在添加...";
  dropZone.classList.add("drag-over");
  compressImage(file).then((dataUrl) => {
    dropZone.textContent = "拖拽图片到此处添加 Logo";
    dropZone.classList.remove("drag-over");
    if (!dataUrl) return;
    const dup = logos.indexOf(dataUrl);
    if (dup !== -1) { logos.splice(dup, 1); logos.unshift(dataUrl); selectedLogo = 0; chrome.storage.local.set({ qrLogos: logos, selectedLogo }); renderLogos(); refreshQR(); return; }
    logos.unshift(dataUrl);
    selectedLogo = 0;
    chrome.storage.local.set({ qrLogos: logos, selectedLogo });
    renderLogos();
    refreshQR();
  });
}

dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) addLogoFile(file);
});

document.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      addLogoFile(item.getAsFile());
      break;
    }
  }
});

function refreshQR() {
  if (lastQRText) { const t = lastQRText; lastQRText = ""; showQR(t); }
}

chrome.storage.local.get(["qrLogos", "selectedLogo"]).then(({ qrLogos, selectedLogo: sl }) => {
  logos = qrLogos || [];
  selectedLogo = sl ?? null;
  renderLogos();
});

// 高级设置
let correctLevel = "M";
let qrSize = 200;
let qrMargin = 10;
const levelMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
const sizeInput = document.getElementById("qr-size");
const sizeCur = document.getElementById("qr-size-cur");
const sizeMaxInput = document.getElementById("qr-size-max");
const marginInput = document.getElementById("qr-margin");
const marginCur = document.getElementById("qr-margin-cur");
const marginMaxInput = document.getElementById("qr-margin-max");

chrome.storage.local.get(["qrLevel", "qrSize", "qrMargin", "qrSizeMax", "qrMarginMax"]).then(({ qrLevel, qrSize: s, qrMargin: m, qrSizeMax, qrMarginMax }) => {
  if (qrLevel) {
    correctLevel = qrLevel;
    document.querySelectorAll(".level-option").forEach(el => el.classList.toggle("active", el.dataset.level === qrLevel));
  }
  if (qrSizeMax) { sizeMaxInput.value = qrSizeMax; sizeInput.max = qrSizeMax; }
  if (qrMarginMax != null) { marginMaxInput.value = qrMarginMax; marginInput.max = qrMarginMax; }
  if (s) { qrSize = s; sizeInput.value = s; sizeCur.textContent = s + "px"; }
  if (m != null) { qrMargin = m; marginInput.value = m; marginCur.textContent = m + "px"; }
});

document.querySelector(".level-options").addEventListener("click", (e) => {
  const opt = e.target.closest(".level-option");
  if (!opt) return;
  correctLevel = opt.dataset.level;
  chrome.storage.local.set({ qrLevel: correctLevel });
  document.querySelectorAll(".level-option").forEach(el => el.classList.remove("active"));
  opt.classList.add("active");
  refreshQR();
});

let sizeTimer = 0;
sizeInput.addEventListener("input", () => {
  qrSize = parseInt(sizeInput.value);
  sizeCur.textContent = qrSize + "px";
  clearTimeout(sizeTimer);
  sizeTimer = setTimeout(() => { chrome.storage.local.set({ qrSize }); refreshQR(); }, 150);
});

sizeMaxInput.addEventListener("change", () => {
  let v = parseInt(sizeMaxInput.value);
  if (isNaN(v) || v < 21) v = 21;
  sizeMaxInput.value = v;
  sizeInput.max = v;
  if (qrSize > v) { qrSize = v; sizeInput.value = v; sizeCur.textContent = v + "px"; chrome.storage.local.set({ qrSize }); refreshQR(); }
  chrome.storage.local.set({ qrSizeMax: v });
});

let marginTimer = 0;
marginInput.addEventListener("input", () => {
  qrMargin = parseInt(marginInput.value);
  marginCur.textContent = qrMargin + "px";
  clearTimeout(marginTimer);
  marginTimer = setTimeout(() => { chrome.storage.local.set({ qrMargin }); refreshQR(); }, 150);
});

marginMaxInput.addEventListener("change", () => {
  let v = parseInt(marginMaxInput.value);
  if (isNaN(v) || v < 0) v = 0;
  marginMaxInput.value = v;
  marginInput.max = v;
  if (qrMargin > v) { qrMargin = v; marginInput.value = v; marginCur.textContent = v + "px"; chrome.storage.local.set({ qrMargin }); refreshQR(); }
  chrome.storage.local.set({ qrMarginMax: v });
});

function onColorChange() {
  chrome.storage.local.set({ qrColorFg: colorFg.value, qrColorBg: colorBg.value });
  if (lastQRText) {
    lastQRText = "";
    showQR(inputText.value.trim());
  }
}

// 生成按钮
document.getElementById("generate-btn").addEventListener("click", () => {
  const text = inputText.value.trim();
  if (!text) return;
  showQR(text);
  saveHistory(text);
});

// 清空按钮
document.getElementById("clear-all").addEventListener("click", async () => {
  await chrome.storage.local.set({ qrHistory: [] });
  renderHistory([]);
  qrBox.innerHTML = "";
  qrBox.classList.remove("active");
  decodeResult.className = "";
  decodeResult.style.display = "none";
  resultArea.classList.remove("active");
});

// 显示二维码
let lastQRText = "";
let qrGen = 0;
function showQR(text) {
  resultArea.classList.add("active");
  decodeResult.className = "";
  decodeResult.style.display = "none";
  if (lastQRText === text && qrBox.classList.contains("active")) return;
  lastQRText = text;
  const gen = ++qrGen;
  const tmp = document.createElement("div");
  tmp.style.cssText = "position:absolute;left:-9999px;";
  document.body.appendChild(tmp);
  try {
    new QRCode(tmp, {
      text: text,
      width: qrSize,
      height: qrSize,
      colorDark: colorFg.value,
      colorLight: colorBg.value,
      correctLevel: levelMap[correctLevel]
    });
  } catch (e) {
    tmp.remove();
    lastQRText = "";
    qrBox.innerHTML = "";
    qrBox.classList.remove("active");
    decodeResult.className = "fail";
    decodeResult.style.display = "block";
    decodeResult.textContent = "内容超出二维码编码容量，请减少文本或降低容错级别";
    return;
  }
  const flush = () => {
    if (gen !== qrGen) { tmp.remove(); return; }
    const cvs = tmp.querySelector("canvas");
    if (!cvs || !cvs.width || !cvs.height) { tmp.remove(); return; }
    // 先叠加 logo（如果有），再应用边距
    if (selectedLogo !== null && logos[selectedLogo]) {
      overlayLogo(cvs, logos[selectedLogo], (logoImg) => {
        if (gen !== qrGen) { tmp.remove(); return; }
        const final = applyMarginToCanvas(logoImg);
        showFinalImg(final);
        tmp.remove();
      });
    } else {
      const final = applyMarginToCanvas(cvs);
      showFinalImg(final);
      tmp.remove();
    }
  };

  function applyMarginToCanvas(source) {
    if (qrMargin <= 0) return source;
    if (source.width === 0 || source.height === 0) return source;
    const total = qrSize + qrMargin * 2;
    const c = document.createElement("canvas");
    c.width = total;
    c.height = total;
    const cx = c.getContext("2d");
    cx.fillStyle = "#fff";
    cx.fillRect(0, 0, total, total);
    cx.drawImage(source, qrMargin, qrMargin, qrSize, qrSize);
    return c;
  }

  function showFinalImg(source) {
    const result = new Image();
    result.onload = () => {
      qrBox.innerHTML = "";
      qrBox.classList.add("active");
      qrBox.appendChild(result);
    };
    if (source instanceof HTMLCanvasElement) {
      result.src = source.toDataURL();
    } else {
      result.src = source.src;
    }
    result.style.display = "block";
  }
  const img = tmp.querySelector("img");
  if (img && !img.complete) {
    img.onload = flush;
    img.onerror = flush;
  } else {
    flush();
  }
}

// 叠加 logo 到二维码
function overlayLogo(qrCanvas, logoDataUrl, cb) {
  const s = qrSize;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(qrCanvas, 0, 0, s, s);

  const logo = new Image();
  logo.onload = () => {
    const size = Math.round(s * 0.2);
    const x = (s - size) / 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 2, x - 2, size + 4, size + 4);
    ctx.drawImage(logo, x, x, size, size);
    finish();
  };
  logo.onerror = finish;
  logo.src = logoDataUrl;

  function finish() {
    const result = new Image();
    result.onload = () => cb(result);
    result.src = canvas.toDataURL();
    result.style.display = "block";
  }
}

// 保存历史
async function saveHistory(text, type = "generate") {
  const { qrHistory = [] } = await chrome.storage.local.get("qrHistory");
  const idx = qrHistory.findIndex(item => item.text === text && item.type === type);
  if (idx !== -1) qrHistory.splice(idx, 1);
  qrHistory.unshift({ text, type, time: Date.now() });
  if (qrHistory.length > 50) qrHistory.length = 50;
  await chrome.storage.local.set({ qrHistory });
  renderHistory(qrHistory);
}

// 单条删除
async function deleteItem(index) {
  const { qrHistory = [] } = await chrome.storage.local.get("qrHistory");
  qrHistory.splice(index, 1);
  await chrome.storage.local.set({ qrHistory });
  renderHistory(qrHistory);
}

// 渲染历史列表
function renderHistory(list) {
  if (!list.length) {
    historyList.innerHTML = '<li class="empty-hint" style="cursor:default;">暂无历史记录</li>';
    return;
  }
  historyList.innerHTML = list.map((item, i) => {
    const date = new Date(item.time);
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    const display = item.text.length > 30 ? item.text.substring(0, 30) + "..." : item.text;
    const tag = item.type === "decode" ? '<span class="tag decode">解析</span>' : '<span class="tag generate">生成</span>';
    return `<li data-index="${i}" title="${item.text.replace(/"/g, '&quot;')}">${tag}<span class="text">${display}<span class="time">${timeStr}</span></span><span class="delete-btn" data-del="${i}">&times;</span></li>`;
  }).join("");
}

// 点击历史列表（选中 / 删除）
historyList.addEventListener("click", async (e) => {
  // 删除按钮
  const delBtn = e.target.closest(".delete-btn");
  if (delBtn) {
    e.stopPropagation();
    await deleteItem(parseInt(delBtn.dataset.del));
    return;
  }
  // 选中项
  const li = e.target.closest("li[data-index]");
  if (!li) return;
  const { qrHistory = [] } = await chrome.storage.local.get("qrHistory");
  const item = qrHistory[parseInt(li.dataset.index)];
  if (item) {
    historyList.querySelectorAll("li").forEach(el => el.classList.remove("active"));
    li.classList.add("active");
    if (item.type === "decode") {
      inputText.value = "";
      showDecodeResult(item.text);
    } else {
      inputText.value = item.text;
      showQR(item.text);
    }
  }
});

// 解码二维码图片
async function decodeQR(url) {
  resultArea.classList.add("active");
  qrBox.innerHTML = "";
  qrBox.classList.remove("active");
  decodeResult.className = "";
  decodeResult.textContent = "正在解析...";
  decodeResult.style.display = "block";

  try {
    const img = await loadImage(url);
    const text = await tryBarcodeDetector(img) || await tryJsQR(img);
    if (text) {
      showDecodeResult(text);
      saveHistory(text, "decode");
    } else {
      decodeResult.className = "fail";
      decodeResult.textContent = "未识别到二维码";
    }
  } catch {
    decodeResult.className = "fail";
    decodeResult.textContent = "图片加载失败";
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// 优先用 Chrome 原生 BarcodeDetector
async function tryBarcodeDetector(img) {
  if (!("BarcodeDetector" in window)) return null;
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const results = await detector.detect(img);
    return results.length ? results[0].rawValue : null;
  } catch {
    return null;
  }
}

// jsQR 兜底
function tryJsQR(img) {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imageData.data, w, h);
  return code ? code.data : null;
}

function showDecodeResult(text) {
  resultArea.classList.add("active");
  qrBox.innerHTML = "";
  qrBox.classList.remove("active");
  lastQRText = "";
  decodeResult.className = "success";
  decodeResult.style.display = "block";
  let contentHtml;
  try {
    new URL(text);
    contentHtml = `<a href="${text.replace(/"/g, '&quot;')}" target="_blank">${text.replace(/</g, '&lt;')}</a>`;
  } catch {
    contentHtml = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const copyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  decodeResult.innerHTML = `<div class="decode-header"><span>解析二维码</span><button class="copy-btn" title="复制">${copyIcon}<span>复制</span></button></div><div class="decode-body">${contentHtml}</div>`;
  decodeResult.querySelector(".copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      const btn = decodeResult.querySelector(".copy-btn");
      btn.innerHTML = `${checkIcon}<span>已复制</span>`;
      setTimeout(() => { btn.innerHTML = `${copyIcon}<span>复制</span>`; }, 1500);
    });
  });
}

// 初始化加载历史 & 处理待办操作
chrome.storage.local.get(["qrHistory", "pendingQRText", "pendingDecodeUrl", "pendingCanvasTabId"]).then(async ({ qrHistory = [], pendingQRText, pendingDecodeUrl, pendingCanvasTabId }) => {
  renderHistory(qrHistory);
  if (pendingCanvasTabId) {
    chrome.storage.local.remove("pendingCanvasTabId");
    async function getCanvasData(tabId) {
      try {
        return await chrome.tabs.sendMessage(tabId, { action: "getCanvasData" });
      } catch {
        // content script 未加载，注入后重试
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"]
        });
        return await chrome.tabs.sendMessage(tabId, { action: "getCanvasData" });
      }
    }
    try {
      const dataUrl = await getCanvasData(pendingCanvasTabId);
      if (dataUrl) {
        decodeQR(dataUrl);
      } else {
        decodeResult.className = "fail";
        decodeResult.textContent = "右键点击的不是 Canvas 元素";
        decodeResult.style.display = "block";
      }
    } catch {
      decodeResult.className = "fail";
      decodeResult.textContent = "无法获取 Canvas 数据，请刷新页面后重试";
      decodeResult.style.display = "block";
    }
  } else if (pendingDecodeUrl) {
    decodeQR(pendingDecodeUrl);
    chrome.storage.local.remove("pendingDecodeUrl");
  } else if (pendingQRText) {
    inputText.value = pendingQRText;
    showQR(pendingQRText);
    chrome.storage.local.remove("pendingQRText");
  }
});
