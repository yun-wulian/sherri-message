const g = [];
function i(e, ...t) {
  const o = (/* @__PURE__ */ new Date()).toLocaleTimeString("zh-CN", { hour12: !1 }), r = t.map((a) => {
    if (typeof a == "object")
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    return String(a);
  }).join(" ");
  for (g.push({ time: o, level: e, message: r }); g.length > 100; )
    g.shift();
  (e === "error" ? console.error : e === "warn" ? console.warn : console.log)("[sherri-message]", ...t), S();
}
function S() {
  try {
    const o = window.sherri_message?.getPreloadLogs?.() || [];
    for (const r of o)
      g.push({ time: "", level: "info", message: r });
    for (; g.length > 100; )
      g.shift();
  } catch {
  }
  const e = document.getElementById("sherri-debug-logs");
  if (!e) return;
  const t = {
    info: "#333",
    warn: "#f59e0b",
    error: "#ef4444"
  };
  e.innerHTML = g.map((o) => o.time === "" ? `<div style="color: #0066cc; margin-bottom: 2px; word-break: break-all;">${o.message}</div>` : `<div style="color: ${t[o.level]}; margin-bottom: 2px; word-break: break-all;">
      <span style="color: #888;">[${o.time}]</span> ${o.message}
    </div>`).join(""), e.scrollTop = e.scrollHeight;
}
const Q = /* @__PURE__ */ new Set([
  "dep",
  "__v_raw",
  "__v_skip",
  "_value",
  "__ob__",
  "prevDep",
  "nextDep",
  "prevSub",
  "nextSub",
  "deps",
  "subs",
  "__vueParentComponent",
  "parent",
  "provides"
]);
function K(e, t, o = "app") {
  if (!e || typeof e != "object") return null;
  const r = (s) => s !== null && typeof s == "object", n = /* @__PURE__ */ new WeakSet(), a = [
    { obj: e, pathSegments: [] }
  ];
  n.add(e);
  const l = (s) => /^\d+$/.test(s) ? `[${s}]` : /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) ? `.${s}` : `['${s.replace(/'/g, "\\'")}']`;
  for (let s = 0; s < a.length; s++) {
    const { obj: d, pathSegments: p } = a[s];
    if (r(d) && Object.prototype.hasOwnProperty.call(d, t)) {
      const u = d[t];
      return { path: o + p.map(l).join("") + l(t), value: u, parent: d };
    }
    const f = Object.keys(d);
    for (let u = 0; u < f.length; u++) {
      const y = f[u];
      if (Q.has(y)) continue;
      const x = d[y];
      if (r(x) && !n.has(x)) {
        n.add(x);
        const w = p.length ? p.slice() : [];
        w.push(y), a.push({ obj: x, pathSegments: w });
      }
    }
  }
  return null;
}
let k = null, T = null;
const J = [];
function B() {
  const e = K(app, "curAioData");
  if (!e?.value || !e.value.chatType) {
    setTimeout(B, 500), i("info", "等待 curAioData 初始化...");
    return;
  }
  i("info", "找到 curAioData:", e.path), k = e.value, Object.defineProperty(e.parent, "curAioData", {
    enumerable: !0,
    configurable: !0,
    get() {
      return k;
    },
    set(t) {
      i("info", "curAioData 更新:", t), k = t, I();
    }
  }), I();
}
function I() {
  k && (T = {
    chatType: k.chatType,
    peerUid: k.header?.uid || "",
    guildId: ""
  }, i("info", "peer 更新:", T), J.forEach((e) => {
    e(T);
  }));
}
function V() {
  return T;
}
const O = typeof LiteLoader < "u" && LiteLoader.plugins["sherri-message"]?.path?.plugin || "";
let q = !1;
const $ = "SherriFont", c = {
  canvasWidth: 2400,
  canvasHeight: 900,
  bgCount: 16,
  avatarCount: 7,
  textArea: { left: 700, top: 280, right: 2339, bottom: 750 },
  roleNameChars: [
    { char: "橘", x: 759, y: 73, fontSize: 186, color: [137, 177, 251] },
    { char: "雪", x: 943, y: 110, fontSize: 147, color: [255, 255, 255] },
    { char: "莉", x: 1093, y: 175, fontSize: 92, color: [255, 255, 255] }
  ],
  roleOffsetX: -50,
  roleOffsetY: 50,
  textColor: "#FFFFFF",
  shadowColor: "#000000",
  shadowOffset: 4,
  bracketColor: "#F9595E",
  lineSpacing: 1.15,
  maxFontSize: 140,
  minFontSize: 20,
  get fontFamily() {
    return q ? `${$}, Microsoft YaHei, sans-serif` : "Microsoft YaHei, sans-serif";
  }
};
async function Z() {
  if (q) return;
  const t = `local:///${O.replace(/\\/g, "/")}/dist/assets/font3.ttf`;
  if (!document.getElementById("sherri-font-style")) {
    const o = document.createElement("style");
    o.id = "sherri-font-style", o.textContent = `
      @font-face {
        font-family: '${$}';
        src: url('${t}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `, document.head.appendChild(o);
  }
  try {
    const o = new FontFace($, `url('${t}')`);
    await o.load(), document.fonts.add(o), q = !0, i("info", "自定义字体加载成功");
  } catch (o) {
    i("warn", "FontFace 加载失败:", o), q = !0;
  }
  try {
    await document.fonts.load(`72px ${$}`);
  } catch {
    i("warn", "字体等待失败");
  }
}
function E(e) {
  return new Promise((t, o) => {
    const r = new Image();
    r.crossOrigin = "anonymous", r.onload = () => t(r), r.onerror = o, r.src = e;
  });
}
function z(e, t, o, r) {
  e.font = `${r}px ${c.fontFamily}`;
  const n = [], a = t.split(`
`);
  for (const l of a) {
    if (l === "") {
      n.push("");
      continue;
    }
    let s = "";
    for (const d of l) {
      const p = s + d;
      e.measureText(p).width > o && s !== "" ? (n.push(s), s = d) : s = p;
    }
    s && n.push(s);
  }
  return n;
}
function ee(e, t, o, r, n, a) {
  for (let l = n; l >= a; l--) {
    const s = z(e, t, o, l);
    if (s.length * l * c.lineSpacing <= r)
      return { fontSize: l, lines: s };
  }
  return { fontSize: a, lines: z(e, t, o, a) };
}
function te(e) {
  const t = [];
  let o = !1, r = "";
  for (const n of e)
    n === "[" || n === "【" ? (r && t.push({ text: r, highlight: o }), t.push({ text: n, highlight: !0 }), r = "", o = !0) : n === "]" || n === "】" ? (r && t.push({ text: r, highlight: !0 }), t.push({ text: n, highlight: !0 }), r = "", o = !1) : r += n;
  return r && t.push({ text: r, highlight: o }), t;
}
function re(e, t, o) {
  for (const n of c.roleNameChars) {
    const { char: a, x: l, y: s, fontSize: d, color: p } = n;
    e.font = `${d}px ${c.fontFamily}`, e.textAlign = "left", e.textBaseline = "top";
    const f = l + t, u = s + o;
    e.fillStyle = c.shadowColor, e.fillText(a, f + 2, u + 2), e.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`, e.fillText(a, f, u);
  }
}
function oe(e, t, o, r) {
  let n = r.top + o;
  e.font = `${o}px ${c.fontFamily}`, e.textBaseline = "top", e.textAlign = "left";
  for (const a of t) {
    let l = r.left;
    const s = te(a);
    for (const d of s) {
      const p = d.highlight ? c.bracketColor : c.textColor;
      e.fillStyle = c.shadowColor, e.fillText(d.text, l + c.shadowOffset, n + c.shadowOffset), e.fillStyle = p, e.fillText(d.text, l, n), l += e.measureText(d.text).width;
    }
    n += o * c.lineSpacing;
  }
}
async function ne() {
  try {
    if (typeof window.sherri_message < "u")
      return await window.sherri_message.getConfig();
  } catch (e) {
    i("warn", "读取配置失败:", e);
  }
  return {};
}
async function M(e, t = {}) {
  await Z();
  const o = document.createElement("canvas");
  o.width = c.canvasWidth, o.height = c.canvasHeight;
  const r = o.getContext("2d"), a = `local:///${O.replace(/\\/g, "/")}/dist/assets`;
  try {
    const l = Math.floor(Math.random() * c.bgCount) + 1, s = await E(`${a}/background/c${l}.png`);
    r.drawImage(s, 0, 0, c.canvasWidth, c.canvasHeight);
    const d = Math.floor(Math.random() * c.avatarCount) + 1, p = await E(`${a}/sherri/sherri (${d}).png`), y = Math.min(700 / p.width, 850 / p.height), x = p.width * y, w = p.height * y, H = 20, D = c.canvasHeight - w;
    r.drawImage(p, H, D, x, w);
    const X = t.roleOffsetX || 0, N = t.roleOffsetY || 0;
    re(r, X, N);
    const v = {
      left: t.textLeft ?? c.textArea.left,
      top: t.textTop ?? c.textArea.top,
      right: t.textRight ?? c.textArea.right,
      bottom: t.textBottom ?? c.textArea.bottom
    }, Y = v.right - v.left, j = v.bottom - v.top, R = t.maxFontSize ?? c.maxFontSize, W = t.minFontSize ?? c.minFontSize, { fontSize: U, lines: G } = ee(r, e, Y, j, R, W);
    oe(r, G, U, v);
    const m = document.createElement("canvas");
    return m.width = Math.round(c.canvasWidth * 0.7), m.height = Math.round(c.canvasHeight * 0.7), m.getContext("2d").drawImage(o, 0, 0, m.width, m.height), m;
  } catch (l) {
    throw i("error", "生成图片失败:", l), l;
  }
}
async function ie(e) {
  const t = await ne();
  return M(e, t);
}
function P() {
  const e = document.querySelector(".ck.ck-content.ck-editor__editable");
  return e ? e.innerText.trim() : "";
}
function se() {
  try {
    const t = document.querySelector(".ck.ck-content.ck-editor__editable");
    if (t && t.ckeditorInstance) {
      t.ckeditorInstance.setData("");
      return;
    }
  } catch {
    i("warn", "CKEditor API 不可用，使用备用方法");
  }
  const e = document.querySelector(".ck.ck-content.ck-editor__editable");
  e && (e.innerHTML = "<p><br></p>", e.dispatchEvent(new Event("input", { bubbles: !0 })));
}
function b(e, t = "info") {
  const o = document.getElementById("sherri-toast");
  o && o.remove();
  const r = {
    info: "#667eea",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444"
  }, n = document.createElement("div");
  n.id = "sherri-toast", n.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${r[t]};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: sherri-toast-in 0.3s ease;
  `, n.textContent = e, document.body.appendChild(n), setTimeout(() => {
    n.style.opacity = "0", n.style.transition = "opacity 0.3s", setTimeout(() => n.remove(), 300);
  }, 3e3);
}
async function ae() {
  try {
    const e = await navigator.clipboard.read();
    for (const t of e) {
      if (t.types.includes("image/png")) {
        const o = await t.getType("image/png");
        return i("info", "保存剪贴板: 图片, 大小:", o.size), { type: "image", imageBlob: o };
      }
      if (t.types.includes("image/jpeg")) {
        const o = await t.getType("image/jpeg");
        return i("info", "保存剪贴板: JPEG图片, 大小:", o.size), { type: "image", imageBlob: o };
      }
      if (t.types.includes("text/html")) {
        const r = await (await t.getType("text/html")).text();
        return i("info", "保存剪贴板: HTML, 长度:", r.length), { type: "html", html: r };
      }
      if (t.types.includes("text/plain")) {
        const r = await (await t.getType("text/plain")).text();
        return i("info", "保存剪贴板: 文本, 长度:", r.length), { type: "text", text: r };
      }
    }
    return i("info", "剪贴板为空或格式不支持"), { type: "empty" };
  } catch (e) {
    return i("warn", "读取剪贴板失败:", e), { type: "empty" };
  }
}
async function C(e) {
  try {
    if (e.type === "empty") {
      i("info", "剪贴板原本为空，跳过恢复");
      return;
    }
    if (e.type === "image" && e.imageBlob) {
      const t = new ClipboardItem({
        [e.imageBlob.type]: e.imageBlob
      });
      await navigator.clipboard.write([t]), i("info", "剪贴板已恢复: 图片");
      return;
    }
    if (e.type === "html" && e.html) {
      const t = new Blob([e.html], { type: "text/html" }), o = document.createElement("div");
      o.innerHTML = e.html;
      const r = o.textContent || "", n = new Blob([r], { type: "text/plain" }), a = new ClipboardItem({
        "text/html": t,
        "text/plain": n
      });
      await navigator.clipboard.write([a]), i("info", "剪贴板已恢复: HTML");
      return;
    }
    if (e.type === "text" && e.text) {
      await navigator.clipboard.writeText(e.text), i("info", "剪贴板已恢复: 文本");
      return;
    }
    i("warn", "无法恢复剪贴板，缓存数据不完整");
  } catch (t) {
    i("error", "恢复剪贴板失败:", t);
  }
}
async function le(e) {
  const t = document.querySelector(".ck.ck-content.ck-editor__editable");
  if (!t)
    return i("error", "找不到编辑器"), !1;
  try {
    const o = await new Promise((n) => {
      e.toBlob((a) => n(a), "image/png");
    });
    if (!o)
      return i("error", "canvas.toBlob 返回 null"), !1;
    i("info", "图片 Blob 大小:", o.size), t.focus(), await new Promise((n) => setTimeout(n, 100));
    try {
      const n = new ClipboardItem({
        "image/png": o
      });
      await navigator.clipboard.write([n]), i("info", "图片已写入剪贴板");
    } catch (n) {
      return i("error", "Clipboard API 写入失败:", n), !1;
    }
    await new Promise((n) => requestAnimationFrame(n));
    const r = new KeyboardEvent("keydown", {
      key: "v",
      code: "KeyV",
      ctrlKey: !0,
      bubbles: !0,
      cancelable: !0
    });
    t.dispatchEvent(r), i("info", "已触发 Ctrl+V");
    try {
      document.execCommand("paste"), i("info", "execCommand paste 执行");
    } catch {
      i("warn", "execCommand paste 不支持");
    }
    return await new Promise((n) => setTimeout(n, 500)), !0;
  } catch (o) {
    return i("error", "粘贴图片失败:", o), !1;
  }
}
function ce() {
  const e = [
    ".send-btn-wrap .send-btn",
    ".send-btn-wrap button",
    ".operation .send-btn:not(.sherri-send-btn)"
  ];
  for (const o of e) {
    const r = document.querySelector(o);
    if (r && !r.classList.contains("sherri-send-btn") && !r.closest(".sherri-send-btn"))
      return i("info", "找到发送按钮:", o, "className:", r.className), r.click(), i("info", "已点击发送按钮"), !0;
  }
  const t = document.querySelector(".send-btn-wrap");
  if (t) {
    const o = t.querySelectorAll("*");
    for (const r of o) {
      const n = r;
      if (n.tagName === "BUTTON" || n.classList.contains("send-btn") || n.getAttribute("role") === "button")
        return i("info", "找到发送按钮 (fallback):", n.tagName, n.className), n.click(), !0;
    }
  }
  return i("error", "找不到发送按钮"), !1;
}
async function A() {
  i("info", "开始 sendSherriMessage (粘贴模式)");
  const e = P();
  if (!e) {
    b("请先输入消息内容", "warning");
    return;
  }
  i("info", "输入文本:", e), i("info", "保存剪贴板内容...");
  const t = await ae();
  try {
    b("正在生成图片...", "info"), i("info", "开始生成图片...");
    const o = await ie(e);
    if (i("info", "图片生成完成, canvas:", o.width, "x", o.height), se(), i("info", "粘贴图片到编辑器..."), !await le(o)) {
      b("粘贴图片失败", "error"), await C(t);
      return;
    }
    if (i("info", "等待图片处理..."), await new Promise((a) => setTimeout(a, 500)), i("info", "点击发送按钮..."), !ce()) {
      b("找不到发送按钮", "error"), await C(t);
      return;
    }
    b("图片已发送", "success"), i("info", "发送完成"), await new Promise((a) => setTimeout(a, 300)), i("info", "恢复剪贴板内容..."), await C(t);
  } catch (o) {
    i("error", "发送失败:", o), b("发送失败: " + o.message, "error"), await C(t);
  }
}
let h = {
  enabled: !0,
  key: "Enter",
  shift: !0,
  ctrl: !1,
  alt: !1
};
function de(e) {
  return h.enabled ? e.key === h.key && e.shiftKey === h.shift && e.ctrlKey === h.ctrl && e.altKey === h.alt : !1;
}
function pe() {
  document.addEventListener("keydown", (e) => {
    const t = document.querySelector(".ck.ck-content.ck-editor__editable");
    !t || !t.contains(document.activeElement) && document.activeElement !== t || de(e) && (e.preventDefault(), e.stopPropagation(), A());
  }, !0), i("info", "快捷键监听已设置");
}
async function ue() {
  try {
    if (typeof window.sherri_message < "u") {
      const e = await window.sherri_message.getConfig() || {};
      e.hotkey && (h = { ...h, ...e.hotkey });
    }
  } catch (e) {
    i("warn", "加载快捷键配置失败:", e);
  }
}
function fe() {
  const e = document.createElement("div");
  if (e.className = "sherri-send-btn", e.innerHTML = '<span class="sherri-btn-inner">Sherri !</span>', !document.getElementById("sherri-btn-style")) {
    const n = document.createElement("style");
    n.id = "sherri-btn-style", n.textContent = `
      .sherri-send-btn {
        display: inline-flex;
        align-items: center;
        margin-right: 8px;
      }
      .sherri-btn-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px 12px;
        background: #0066CC;
        color: white;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .sherri-btn-inner.disabled {
        color: rgba(255, 255, 255, 0.5);
        cursor: default;
      }
      .sherri-btn-inner:not(.disabled):hover {
        filter: brightness(1.1);
        box-shadow: 0 2px 8px rgba(0, 102, 204, 0.4);
      }
      @keyframes sherri-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `, document.head.appendChild(n);
  }
  function t() {
    const n = P(), a = e.querySelector(".sherri-btn-inner");
    a && (n ? a.classList.remove("disabled") : a.classList.add("disabled"));
  }
  const o = new MutationObserver(t), r = () => {
    const n = document.querySelector(".ck.ck-content.ck-editor__editable");
    n && (o.observe(n, { childList: !0, subtree: !0, characterData: !0 }), n.addEventListener("input", t), t());
  };
  return r(), setTimeout(r, 500), e.addEventListener("click", A), e;
}
function _() {
  const e = document.querySelector(".operation");
  if (!e) return !1;
  if (e.querySelector(".sherri-send-btn")) return !0;
  const t = e.querySelector(".send-btn-wrap");
  if (!t) return !1;
  const o = fe();
  return t.parentElement?.insertBefore(o, t), i("info", "按钮已注入"), !0;
}
function F() {
  new MutationObserver(() => {
    _();
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  }), _();
}
function he() {
  if (document.getElementById("sherri-debug-panel")) return;
  const e = document.createElement("div");
  e.id = "sherri-debug-panel", e.innerHTML = `
    <div id="sherri-debug-header" style="
      background: #667eea;
      color: white;
      padding: 8px 12px;
      cursor: move;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    ">
      <span>Sherri Debug (v2)</span>
      <button id="sherri-debug-close" style="
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
      ">x</button>
    </div>
    <div id="sherri-debug-content" style="
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      max-height: 150px;
      overflow-y: auto;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    ">
      <div>加载中...</div>
    </div>
    <div style="padding: 8px 12px; background: #f0f0f0; font-weight: bold; font-size: 12px; color: #333; flex-shrink: 0;">
      日志输出
      <button id="sherri-debug-clear-logs" style="
        margin-left: 10px;
        padding: 2px 8px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      ">清空</button>
    </div>
    <div id="sherri-debug-logs" style="
      padding: 8px 12px;
      font-family: monospace;
      font-size: 11px;
      min-height: 100px;
      flex: 1;
      overflow-y: auto;
      background: #fafafa;
    ">
      <div style="color: #888;">等待日志...</div>
    </div>
    <button id="sherri-debug-refresh" style="
      margin: 8px 12px 12px;
      padding: 6px 12px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      flex-shrink: 0;
    ">刷新状态</button>
  `, e.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    width: 350px;
    height: 450px;
    min-width: 280px;
    min-height: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    color: #333;
    resize: both;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `, document.body.appendChild(e);
  const t = e.querySelector("#sherri-debug-header");
  let o = !1, r = 0, n = 0;
  t.addEventListener("mousedown", (a) => {
    a.target.id !== "sherri-debug-close" && (o = !0, r = a.clientX - e.offsetLeft, n = a.clientY - e.offsetTop);
  }), document.addEventListener("mousemove", (a) => {
    o && (e.style.left = a.clientX - r + "px", e.style.top = a.clientY - n + "px", e.style.right = "auto");
  }), document.addEventListener("mouseup", () => {
    o = !1;
  }), e.querySelector("#sherri-debug-close")?.addEventListener("click", () => {
    e.remove();
  }), e.querySelector("#sherri-debug-refresh")?.addEventListener("click", () => {
    S(), L();
  }), e.querySelector("#sherri-debug-clear-logs")?.addEventListener("click", () => {
    g.length = 0, S();
  }), L(), S(), setInterval(() => {
    L(), S();
  }, 1e3);
}
function L() {
  const e = document.getElementById("sherri-debug-content");
  if (!e) return;
  const t = [], o = V();
  t.push("<b>== Peer 信息 (渲染进程) ==</b>"), t.push(`chatType: ${o?.chatType ?? "❌ null"} (1=好友, 2=群聊)`), t.push(`peerUid: ${o?.peerUid || "❌ 空"}`), o?.chatType && o?.peerUid ? t.push('<b style="color:green">peer 信息完整，可以发送消息</b>') : t.push('<b style="color:orange">请切换到一个聊天窗口</b>'), t.push("<br><b>== 基础检查 ==</b>"), t.push(`webContentId: ${window.sherri_message?.getWebContentId?.() ?? "❌"}`), t.push(`sherri_message API: ${typeof window.sherri_message < "u" ? "" : "❌"}`), t.push(`nativeCall: ${typeof window.sherri_message?.nativeCall == "function" ? "" : "❌"}`), t.push("<br><b>== 聊天窗口 ==</b>");
  const r = document.querySelector(".chat-input-area");
  t.push(`聊天输入区域: ${r ? "" : "❌"}`);
  const n = document.querySelector(".ml-list");
  t.push(`消息列表: ${n ? "" : "❌"}`), e.innerHTML = t.join("<br>");
}
async function ge() {
  i("info", "插件已加载 (v2 - 新版 QQ 适配)"), B(), await ue(), pe(), document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", F) : F(), setTimeout(he, 2e3);
}
ge();
const xe = async (e) => {
  const t = [
    { label: "短文本", value: "这是预览测试文本desuwa" },
    { label: "中等文本", value: "我是丰川祥子，来自魔女审判，这是一段中等长度的测试文本desuwa" },
    { label: "长文本", value: "在遥远的魔法世界里，有一个名叫橘雪莉的魔女审判官，她每天都要处理各种各样的魔法案件，这是一段用于测试自动换行功能的超长文本desuwa" },
    { label: "带括号高亮", value: "我是[橘雪莉]，这里的【括号内容】会以红色高亮显示desuwa" },
    { label: "多行文本", value: `第一行文本
第二行文本
第三行文本desuwa` }
  ];
  let o = {};
  try {
    typeof window.sherri_message < "u" && (o = await window.sherri_message.getConfig() || {});
  } catch (l) {
    console.warn("[sherri-message] 读取配置失败:", l);
  }
  const r = {
    roleOffsetX: -50,
    roleOffsetY: 50,
    textLeft: 700,
    textTop: 280,
    textRight: 2339,
    textBottom: 750,
    maxFontSize: 140,
    minFontSize: 20,
    hotkey: {
      enabled: !0,
      key: "Enter",
      shift: !0,
      ctrl: !1,
      alt: !1
    }
  }, n = o.hotkey || r.hotkey;
  e.innerHTML = `
    <div style="padding: 20px; max-width: 600px; color: #333;">
      <h2 style="margin-bottom: 16px; color: #667eea;">Sherri Message 设置 (v2)</h2>

      <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 16px;">
        <p style="color: #2e7d32; font-size: 13px; margin: 0;">
          <strong>v2 更新：</strong>已适配 QQ 9.9.18+ 版本，使用新版 IPC 通道，不再依赖 Euphony。
        </p>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">快捷键设置</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <input type="checkbox" id="sherri-hotkey-enabled" ${n.enabled ? "checked" : ""}>
            <span>启用快捷键发送</span>
          </label>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-shift" ${n.shift ? "checked" : ""}>
              <span>Shift</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-ctrl" ${n.ctrl ? "checked" : ""}>
              <span>Ctrl</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-alt" ${n.alt ? "checked" : ""}>
              <span>Alt</span>
            </label>
            <span style="color: #333;">+</span>
            <select id="sherri-hotkey-key" style="padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
              <option value="Enter" ${n.key === "Enter" ? "selected" : ""}>Enter</option>
              <option value="s" ${n.key === "s" ? "selected" : ""}>S</option>
              <option value="d" ${n.key === "d" ? "selected" : ""}>D</option>
              <option value="e" ${n.key === "e" ? "selected" : ""}>E</option>
            </select>
          </div>
          <p style="color: #666; font-size: 12px; margin: 0;">当前快捷键: <span id="sherri-hotkey-display" style="font-weight: bold;">${n.shift ? "Shift+" : ""}${n.ctrl ? "Ctrl+" : ""}${n.alt ? "Alt+" : ""}${n.key}</span></p>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">角色名称位置偏移</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">X 偏移:</span>
            <input type="number" id="sherri-role-offset-x" value="${o.roleOffsetX ?? r.roleOffsetX}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">Y 偏移:</span>
            <input type="number" id="sherri-role-offset-y" value="${o.roleOffsetY ?? r.roleOffsetY}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">文本区域位置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">左边距:</span>
            <input type="number" id="sherri-text-left" value="${o.textLeft ?? r.textLeft}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">右边距:</span>
            <input type="number" id="sherri-text-right" value="${o.textRight ?? r.textRight}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">上边距:</span>
            <input type="number" id="sherri-text-top" value="${o.textTop ?? r.textTop}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">下边距:</span>
            <input type="number" id="sherri-text-bottom" value="${o.textBottom ?? r.textBottom}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">字体设置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最大字号:</span>
            <input type="number" id="sherri-max-font" value="${o.maxFontSize ?? r.maxFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最小字号:</span>
            <input type="number" id="sherri-min-font" value="${o.minFontSize ?? r.minFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">预览测试</h3>
        <label style="display: flex; align-items: center; gap: 8px; color: #333; margin-bottom: 10px;">
          <span style="width: 80px;">测试文本:</span>
          <select id="sherri-test-text" style="flex: 1; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
            ${t.map((l, s) => `<option value="${s}">${l.label}</option>`).join("")}
          </select>
        </label>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 16px;">
        <button id="sherri-save-btn" style="padding: 8px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">保存设置</button>
        <button id="sherri-reset-btn" style="padding: 8px 20px; background: #888; color: white; border: none; border-radius: 4px; cursor: pointer;">恢复默认</button>
        <button id="sherri-test-btn" style="padding: 8px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">预览测试</button>
      </div>

      <div id="sherri-preview" style="margin-top: 16px;"></div>

      <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 16px;">
        <p style="color: #856404; font-size: 13px; margin: 0;">
          <strong>提示：</strong>使用 [中括号] 包裹的文字会以红色高亮显示。配置实时生效，无需重启 QQ。
        </p>
      </div>
    </div>
  `, e.querySelector("#sherri-save-btn")?.addEventListener("click", async () => {
    const l = {
      roleOffsetX: parseInt(e.querySelector("#sherri-role-offset-x").value) || 0,
      roleOffsetY: parseInt(e.querySelector("#sherri-role-offset-y").value) || 0,
      textLeft: parseInt(e.querySelector("#sherri-text-left").value) || r.textLeft,
      textRight: parseInt(e.querySelector("#sherri-text-right").value) || r.textRight,
      textTop: parseInt(e.querySelector("#sherri-text-top").value),
      textBottom: parseInt(e.querySelector("#sherri-text-bottom").value) || r.textBottom,
      maxFontSize: parseInt(e.querySelector("#sherri-max-font").value) || r.maxFontSize,
      minFontSize: parseInt(e.querySelector("#sherri-min-font").value) || r.minFontSize,
      hotkey: {
        enabled: e.querySelector("#sherri-hotkey-enabled").checked,
        key: e.querySelector("#sherri-hotkey-key").value,
        shift: e.querySelector("#sherri-hotkey-shift").checked,
        ctrl: e.querySelector("#sherri-hotkey-ctrl").checked,
        alt: e.querySelector("#sherri-hotkey-alt").checked
      }
    };
    try {
      if (typeof window.sherri_message < "u") {
        await window.sherri_message.setConfig(l), h = l.hotkey;
        const s = e.querySelector("#sherri-save-btn"), d = s.textContent;
        s.textContent = "已保存", s.style.background = "#10b981", setTimeout(() => {
          s.textContent = d, s.style.background = "#667eea";
        }, 1500);
      }
    } catch (s) {
      console.error("[sherri-message] 保存失败:", s);
    }
  }), e.querySelector("#sherri-reset-btn")?.addEventListener("click", async () => {
    e.querySelector("#sherri-role-offset-x").value = String(r.roleOffsetX), e.querySelector("#sherri-role-offset-y").value = String(r.roleOffsetY), e.querySelector("#sherri-text-left").value = String(r.textLeft), e.querySelector("#sherri-text-right").value = String(r.textRight), e.querySelector("#sherri-text-top").value = String(r.textTop), e.querySelector("#sherri-text-bottom").value = String(r.textBottom), e.querySelector("#sherri-max-font").value = String(r.maxFontSize), e.querySelector("#sherri-min-font").value = String(r.minFontSize), e.querySelector("#sherri-hotkey-enabled").checked = r.hotkey.enabled, e.querySelector("#sherri-hotkey-shift").checked = r.hotkey.shift, e.querySelector("#sherri-hotkey-ctrl").checked = r.hotkey.ctrl, e.querySelector("#sherri-hotkey-alt").checked = r.hotkey.alt, e.querySelector("#sherri-hotkey-key").value = r.hotkey.key, a();
    try {
      typeof window.sherri_message < "u" && (await window.sherri_message.setConfig(r), h = r.hotkey);
    } catch {
    }
    const l = e.querySelector("#sherri-reset-btn"), s = l.textContent;
    l.textContent = "已重置", l.style.background = "#10b981", setTimeout(() => {
      l.textContent = s, l.style.background = "#888";
    }, 1500);
  });
  function a() {
    const l = e.querySelector("#sherri-hotkey-shift").checked, s = e.querySelector("#sherri-hotkey-ctrl").checked, d = e.querySelector("#sherri-hotkey-alt").checked, p = e.querySelector("#sherri-hotkey-key").value, f = `${l ? "Shift+" : ""}${s ? "Ctrl+" : ""}${d ? "Alt+" : ""}${p}`;
    e.querySelector("#sherri-hotkey-display").textContent = f;
  }
  ["#sherri-hotkey-shift", "#sherri-hotkey-ctrl", "#sherri-hotkey-alt", "#sherri-hotkey-key"].forEach((l) => {
    e.querySelector(l)?.addEventListener("change", a);
  }), e.querySelector("#sherri-test-btn")?.addEventListener("click", async () => {
    const l = e.querySelector("#sherri-preview");
    l.innerHTML = '<p style="color: #666;">正在生成预览...</p>';
    try {
      const s = {
        roleOffsetX: parseInt(e.querySelector("#sherri-role-offset-x").value) || 0,
        roleOffsetY: parseInt(e.querySelector("#sherri-role-offset-y").value) || 0,
        textLeft: parseInt(e.querySelector("#sherri-text-left").value) || r.textLeft,
        textRight: parseInt(e.querySelector("#sherri-text-right").value) || r.textRight,
        textTop: parseInt(e.querySelector("#sherri-text-top").value),
        textBottom: parseInt(e.querySelector("#sherri-text-bottom").value) || r.textBottom,
        maxFontSize: parseInt(e.querySelector("#sherri-max-font").value) || r.maxFontSize,
        minFontSize: parseInt(e.querySelector("#sherri-min-font").value) || r.minFontSize
      }, d = parseInt(e.querySelector("#sherri-test-text").value), p = t[d].value, u = (await M(p, s)).toDataURL("image/png");
      l.innerHTML = `<img src="${u}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">`;
    } catch (s) {
      l.innerHTML = `<p style="color: red;">预览失败: ${s.message}</p>`;
    }
  });
};
export {
  xe as onSettingWindowCreated
};
