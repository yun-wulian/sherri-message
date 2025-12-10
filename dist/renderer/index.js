const g = [];
function i(e, ...r) {
  const o = (/* @__PURE__ */ new Date()).toLocaleTimeString("zh-CN", { hour12: !1 }), t = r.map((l) => {
    if (typeof l == "object")
      try {
        return JSON.stringify(l, null, 0);
      } catch {
        return String(l);
      }
    return String(l);
  }).join(" ");
  for (g.push({ time: o, level: e, message: t }); g.length > 100; )
    g.shift();
  (e === "error" ? console.error : e === "warn" ? console.warn : console.log)("[sherri-message]", ...r), G();
}
function G() {
  try {
    const o = window.sherri_message?.getPreloadLogs?.() || [];
    for (const t of o)
      g.push({ time: "", level: "info", message: t });
    for (; g.length > 100; )
      g.shift();
  } catch {
  }
  const e = document.getElementById("sherri-debug-logs");
  if (!e) return;
  const r = {
    info: "#333",
    warn: "#f59e0b",
    error: "#ef4444"
  };
  e.innerHTML = g.map((o) => o.time === "" ? `<div style="color: #0066cc; margin-bottom: 2px; word-break: break-all;">${o.message}</div>` : `<div style="color: ${r[o.level]}; margin-bottom: 2px; word-break: break-all;">
      <span style="color: #888;">[${o.time}]</span> ${o.message}
    </div>`).join(""), e.scrollTop = e.scrollHeight;
}
const U = /* @__PURE__ */ new Set([
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
function Q(e, r, o = "app") {
  if (!e || typeof e != "object") return null;
  const t = (a) => a !== null && typeof a == "object", n = /* @__PURE__ */ new WeakSet(), l = [
    { obj: e, pathSegments: [] }
  ];
  n.add(e);
  const s = (a) => /^\d+$/.test(a) ? `[${a}]` : /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(a) ? `.${a}` : `['${a.replace(/'/g, "\\'")}']`;
  for (let a = 0; a < l.length; a++) {
    const { obj: d, pathSegments: p } = l[a];
    if (t(d) && Object.prototype.hasOwnProperty.call(d, r)) {
      const f = d[r];
      return { path: o + p.map(s).join("") + s(r), value: f, parent: d };
    }
    const u = Object.keys(d);
    for (let f = 0; f < u.length; f++) {
      const y = u[f];
      if (U.has(y)) continue;
      const m = d[y];
      if (t(m) && !n.has(m)) {
        n.add(m);
        const S = p.length ? p.slice() : [];
        S.push(y), l.push({ obj: m, pathSegments: S });
      }
    }
  }
  return null;
}
let k = null, T = null;
const K = [];
function z() {
  const e = Q(app, "curAioData");
  if (!e?.value || !e.value.chatType) {
    setTimeout(z, 500), i("info", "等待 curAioData 初始化...");
    return;
  }
  i("info", "找到 curAioData:", e.path), k = e.value, Object.defineProperty(e.parent, "curAioData", {
    enumerable: !0,
    configurable: !0,
    get() {
      return k;
    },
    set(r) {
      i("info", "curAioData 更新:", r), k = r, $();
    }
  }), $();
}
function $() {
  k && (T = {
    chatType: k.chatType,
    peerUid: k.header?.uid || "",
    guildId: ""
  }, i("info", "peer 更新:", T), K.forEach((e) => {
    e(T);
  }));
}
const F = typeof LiteLoader < "u" && LiteLoader.plugins["sherri-message"]?.path?.plugin || "";
let C = !1;
const q = "SherriFont", c = {
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
    return C ? `${q}, Microsoft YaHei, sans-serif` : "Microsoft YaHei, sans-serif";
  }
};
async function J() {
  if (C) return;
  const r = `local:///${F.replace(/\\/g, "/")}/dist/assets/font3.ttf`;
  if (!document.getElementById("sherri-font-style")) {
    const o = document.createElement("style");
    o.id = "sherri-font-style", o.textContent = `
      @font-face {
        font-family: '${q}';
        src: url('${r}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `, document.head.appendChild(o);
  }
  try {
    const o = new FontFace(q, `url('${r}')`);
    await o.load(), document.fonts.add(o), C = !0, i("info", "自定义字体加载成功");
  } catch (o) {
    i("warn", "FontFace 加载失败:", o), C = !0;
  }
  try {
    await document.fonts.load(`72px ${q}`);
  } catch {
    i("warn", "字体等待失败");
  }
}
function L(e) {
  return new Promise((r, o) => {
    const t = new Image();
    t.crossOrigin = "anonymous", t.onload = () => r(t), t.onerror = o, t.src = e;
  });
}
function I(e, r, o, t) {
  e.font = `${t}px ${c.fontFamily}`;
  const n = [], l = r.split(`
`);
  for (const s of l) {
    if (s === "") {
      n.push("");
      continue;
    }
    let a = "";
    for (const d of s) {
      const p = a + d;
      e.measureText(p).width > o && a !== "" ? (n.push(a), a = d) : a = p;
    }
    a && n.push(a);
  }
  return n;
}
function V(e, r, o, t, n, l) {
  for (let s = n; s >= l; s--) {
    const a = I(e, r, o, s);
    if (a.length * s * c.lineSpacing <= t)
      return { fontSize: s, lines: a };
  }
  return { fontSize: l, lines: I(e, r, o, l) };
}
function Z(e) {
  const r = [];
  let o = !1, t = "";
  for (const n of e)
    n === "[" || n === "【" ? (t && r.push({ text: t, highlight: o }), r.push({ text: n, highlight: !0 }), t = "", o = !0) : n === "]" || n === "】" ? (t && r.push({ text: t, highlight: !0 }), r.push({ text: n, highlight: !0 }), t = "", o = !1) : t += n;
  return t && r.push({ text: t, highlight: o }), r;
}
function ee(e, r, o) {
  for (const n of c.roleNameChars) {
    const { char: l, x: s, y: a, fontSize: d, color: p } = n;
    e.font = `${d}px ${c.fontFamily}`, e.textAlign = "left", e.textBaseline = "top";
    const u = s + r, f = a + o;
    e.fillStyle = c.shadowColor, e.fillText(l, u + 2, f + 2), e.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`, e.fillText(l, u, f);
  }
}
function te(e, r, o, t) {
  let n = t.top + o;
  e.font = `${o}px ${c.fontFamily}`, e.textBaseline = "top", e.textAlign = "left";
  for (const l of r) {
    let s = t.left;
    const a = Z(l);
    for (const d of a) {
      const p = d.highlight ? c.bracketColor : c.textColor;
      e.fillStyle = c.shadowColor, e.fillText(d.text, s + c.shadowOffset, n + c.shadowOffset), e.fillStyle = p, e.fillText(d.text, s, n), s += e.measureText(d.text).width;
    }
    n += o * c.lineSpacing;
  }
}
async function re() {
  try {
    if (typeof window.sherri_message < "u")
      return await window.sherri_message.getConfig();
  } catch (e) {
    i("warn", "读取配置失败:", e);
  }
  return {};
}
async function O(e, r = {}) {
  await J();
  const o = document.createElement("canvas");
  o.width = c.canvasWidth, o.height = c.canvasHeight;
  const t = o.getContext("2d"), l = `local:///${F.replace(/\\/g, "/")}/dist/assets`;
  try {
    const s = Math.floor(Math.random() * c.bgCount) + 1, a = await L(`${l}/background/c${s}.png`);
    t.drawImage(a, 0, 0, c.canvasWidth, c.canvasHeight);
    const d = Math.floor(Math.random() * c.avatarCount) + 1, p = await L(`${l}/sherri/sherri (${d}).png`), y = Math.min(700 / p.width, 850 / p.height), m = p.width * y, S = p.height * y, A = 20, H = c.canvasHeight - S;
    t.drawImage(p, A, H, m, S);
    const P = r.roleOffsetX || 0, D = r.roleOffsetY || 0;
    ee(t, P, D);
    const w = {
      left: r.textLeft ?? c.textArea.left,
      top: r.textTop ?? c.textArea.top,
      right: r.textRight ?? c.textArea.right,
      bottom: r.textBottom ?? c.textArea.bottom
    }, N = w.right - w.left, X = w.bottom - w.top, R = r.maxFontSize ?? c.maxFontSize, j = r.minFontSize ?? c.minFontSize, { fontSize: Y, lines: W } = V(t, e, N, X, R, j);
    te(t, W, Y, w);
    const x = document.createElement("canvas");
    return x.width = Math.round(c.canvasWidth * 0.7), x.height = Math.round(c.canvasHeight * 0.7), x.getContext("2d").drawImage(o, 0, 0, x.width, x.height), x;
  } catch (s) {
    throw i("error", "生成图片失败:", s), s;
  }
}
async function oe(e) {
  const r = await re();
  return O(e, r);
}
function B() {
  const e = document.querySelector(".ck.ck-content.ck-editor__editable");
  return e ? e.innerText.trim() : "";
}
function ne() {
  try {
    const r = document.querySelector(".ck.ck-content.ck-editor__editable");
    if (r && r.ckeditorInstance) {
      r.ckeditorInstance.setData("");
      return;
    }
  } catch {
    i("warn", "CKEditor API 不可用，使用备用方法");
  }
  const e = document.querySelector(".ck.ck-content.ck-editor__editable");
  e && (e.innerHTML = "<p><br></p>", e.dispatchEvent(new Event("input", { bubbles: !0 })));
}
function b(e, r = "info") {
  const o = document.getElementById("sherri-toast");
  o && o.remove();
  const t = {
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
    background: ${t[r]};
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
async function ie() {
  try {
    const e = await navigator.clipboard.read();
    for (const r of e) {
      if (r.types.includes("image/png")) {
        const o = await r.getType("image/png");
        return i("info", "保存剪贴板: 图片, 大小:", o.size), { type: "image", imageBlob: o };
      }
      if (r.types.includes("image/jpeg")) {
        const o = await r.getType("image/jpeg");
        return i("info", "保存剪贴板: JPEG图片, 大小:", o.size), { type: "image", imageBlob: o };
      }
      if (r.types.includes("text/html")) {
        const t = await (await r.getType("text/html")).text();
        return i("info", "保存剪贴板: HTML, 长度:", t.length), { type: "html", html: t };
      }
      if (r.types.includes("text/plain")) {
        const t = await (await r.getType("text/plain")).text();
        return i("info", "保存剪贴板: 文本, 长度:", t.length), { type: "text", text: t };
      }
    }
    return i("info", "剪贴板为空或格式不支持"), { type: "empty" };
  } catch (e) {
    return i("warn", "读取剪贴板失败:", e), { type: "empty" };
  }
}
async function v(e) {
  try {
    if (e.type === "empty") {
      i("info", "剪贴板原本为空，跳过恢复");
      return;
    }
    if (e.type === "image" && e.imageBlob) {
      const r = new ClipboardItem({
        [e.imageBlob.type]: e.imageBlob
      });
      await navigator.clipboard.write([r]), i("info", "剪贴板已恢复: 图片");
      return;
    }
    if (e.type === "html" && e.html) {
      const r = new Blob([e.html], { type: "text/html" }), o = document.createElement("div");
      o.innerHTML = e.html;
      const t = o.textContent || "", n = new Blob([t], { type: "text/plain" }), l = new ClipboardItem({
        "text/html": r,
        "text/plain": n
      });
      await navigator.clipboard.write([l]), i("info", "剪贴板已恢复: HTML");
      return;
    }
    if (e.type === "text" && e.text) {
      await navigator.clipboard.writeText(e.text), i("info", "剪贴板已恢复: 文本");
      return;
    }
    i("warn", "无法恢复剪贴板，缓存数据不完整");
  } catch (r) {
    i("error", "恢复剪贴板失败:", r);
  }
}
async function ae(e) {
  const r = document.querySelector(".ck.ck-content.ck-editor__editable");
  if (!r)
    return i("error", "找不到编辑器"), !1;
  try {
    const o = await new Promise((n) => {
      e.toBlob((l) => n(l), "image/png");
    });
    if (!o)
      return i("error", "canvas.toBlob 返回 null"), !1;
    i("info", "图片 Blob 大小:", o.size), r.focus(), await new Promise((n) => setTimeout(n, 100));
    try {
      const n = new ClipboardItem({
        "image/png": o
      });
      await navigator.clipboard.write([n]), i("info", "图片已写入剪贴板");
    } catch (n) {
      return i("error", "Clipboard API 写入失败:", n), !1;
    }
    await new Promise((n) => requestAnimationFrame(n));
    const t = new KeyboardEvent("keydown", {
      key: "v",
      code: "KeyV",
      ctrlKey: !0,
      bubbles: !0,
      cancelable: !0
    });
    r.dispatchEvent(t), i("info", "已触发 Ctrl+V");
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
function se() {
  const e = [
    ".send-btn-wrap .send-btn",
    ".send-btn-wrap button",
    ".operation .send-btn:not(.sherri-send-btn)"
  ];
  for (const o of e) {
    const t = document.querySelector(o);
    if (t && !t.classList.contains("sherri-send-btn") && !t.closest(".sherri-send-btn"))
      return i("info", "找到发送按钮:", o, "className:", t.className), t.click(), i("info", "已点击发送按钮"), !0;
  }
  const r = document.querySelector(".send-btn-wrap");
  if (r) {
    const o = r.querySelectorAll("*");
    for (const t of o) {
      const n = t;
      if (n.tagName === "BUTTON" || n.classList.contains("send-btn") || n.getAttribute("role") === "button")
        return i("info", "找到发送按钮 (fallback):", n.tagName, n.className), n.click(), !0;
    }
  }
  return i("error", "找不到发送按钮"), !1;
}
async function M() {
  i("info", "开始 sendSherriMessage (粘贴模式)");
  const e = B();
  if (!e) {
    b("请先输入消息内容", "warning");
    return;
  }
  i("info", "输入文本:", e), i("info", "保存剪贴板内容...");
  const r = await ie();
  try {
    b("正在生成图片...", "info"), i("info", "开始生成图片...");
    const o = await oe(e);
    if (i("info", "图片生成完成, canvas:", o.width, "x", o.height), ne(), i("info", "粘贴图片到编辑器..."), !await ae(o)) {
      b("粘贴图片失败", "error"), await v(r);
      return;
    }
    if (i("info", "等待图片处理..."), await new Promise((l) => setTimeout(l, 500)), i("info", "点击发送按钮..."), !se()) {
      b("找不到发送按钮", "error"), await v(r);
      return;
    }
    b("图片已发送", "success"), i("info", "发送完成"), await new Promise((l) => setTimeout(l, 300)), i("info", "恢复剪贴板内容..."), await v(r);
  } catch (o) {
    i("error", "发送失败:", o), b("发送失败: " + o.message, "error"), await v(r);
  }
}
let h = {
  enabled: !0,
  key: "Enter",
  shift: !0,
  ctrl: !1,
  alt: !1
};
function le(e) {
  return h.enabled ? e.key === h.key && e.shiftKey === h.shift && e.ctrlKey === h.ctrl && e.altKey === h.alt : !1;
}
function ce() {
  document.addEventListener("keydown", (e) => {
    const r = document.querySelector(".ck.ck-content.ck-editor__editable");
    !r || !r.contains(document.activeElement) && document.activeElement !== r || le(e) && (e.preventDefault(), e.stopPropagation(), M());
  }, !0), i("info", "快捷键监听已设置");
}
async function de() {
  try {
    if (typeof window.sherri_message < "u") {
      const e = await window.sherri_message.getConfig() || {};
      e.hotkey && (h = { ...h, ...e.hotkey });
    }
  } catch (e) {
    i("warn", "加载快捷键配置失败:", e);
  }
}
function pe() {
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
  function r() {
    const n = B(), l = e.querySelector(".sherri-btn-inner");
    l && (n ? l.classList.remove("disabled") : l.classList.add("disabled"));
  }
  const o = new MutationObserver(r), t = () => {
    const n = document.querySelector(".ck.ck-content.ck-editor__editable");
    n && (o.observe(n, { childList: !0, subtree: !0, characterData: !0 }), n.addEventListener("input", r), r());
  };
  return t(), setTimeout(t, 500), e.addEventListener("click", M), e;
}
function E() {
  const e = document.querySelector(".operation");
  if (!e) return !1;
  if (e.querySelector(".sherri-send-btn")) return !0;
  const r = e.querySelector(".send-btn-wrap");
  if (!r) return !1;
  const o = pe();
  return r.parentElement?.insertBefore(o, r), i("info", "按钮已注入"), !0;
}
function _() {
  new MutationObserver(() => {
    E();
  }).observe(document.body, {
    childList: !0,
    subtree: !0
  }), E();
}
async function fe() {
  i("info", "插件已加载 (v2 - 新版 QQ 适配)"), z(), await de(), ce(), document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", _) : _();
}
fe();
const he = async (e) => {
  const r = [
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
  } catch (s) {
    console.warn("[sherri-message] 读取配置失败:", s);
  }
  const t = {
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
  }, n = o.hotkey || t.hotkey;
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
            <input type="number" id="sherri-role-offset-x" value="${o.roleOffsetX ?? t.roleOffsetX}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">Y 偏移:</span>
            <input type="number" id="sherri-role-offset-y" value="${o.roleOffsetY ?? t.roleOffsetY}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">文本区域位置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">左边距:</span>
            <input type="number" id="sherri-text-left" value="${o.textLeft ?? t.textLeft}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">右边距:</span>
            <input type="number" id="sherri-text-right" value="${o.textRight ?? t.textRight}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">上边距:</span>
            <input type="number" id="sherri-text-top" value="${o.textTop ?? t.textTop}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">下边距:</span>
            <input type="number" id="sherri-text-bottom" value="${o.textBottom ?? t.textBottom}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">字体设置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最大字号:</span>
            <input type="number" id="sherri-max-font" value="${o.maxFontSize ?? t.maxFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最小字号:</span>
            <input type="number" id="sherri-min-font" value="${o.minFontSize ?? t.minFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">预览测试</h3>
        <label style="display: flex; align-items: center; gap: 8px; color: #333; margin-bottom: 10px;">
          <span style="width: 80px;">测试文本:</span>
          <select id="sherri-test-text" style="flex: 1; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
            ${r.map((s, a) => `<option value="${a}">${s.label}</option>`).join("")}
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
    const s = {
      roleOffsetX: parseInt(e.querySelector("#sherri-role-offset-x").value) || 0,
      roleOffsetY: parseInt(e.querySelector("#sherri-role-offset-y").value) || 0,
      textLeft: parseInt(e.querySelector("#sherri-text-left").value) || t.textLeft,
      textRight: parseInt(e.querySelector("#sherri-text-right").value) || t.textRight,
      textTop: parseInt(e.querySelector("#sherri-text-top").value),
      textBottom: parseInt(e.querySelector("#sherri-text-bottom").value) || t.textBottom,
      maxFontSize: parseInt(e.querySelector("#sherri-max-font").value) || t.maxFontSize,
      minFontSize: parseInt(e.querySelector("#sherri-min-font").value) || t.minFontSize,
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
        await window.sherri_message.setConfig(s), h = s.hotkey;
        const a = e.querySelector("#sherri-save-btn"), d = a.textContent;
        a.textContent = "已保存", a.style.background = "#10b981", setTimeout(() => {
          a.textContent = d, a.style.background = "#667eea";
        }, 1500);
      }
    } catch (a) {
      console.error("[sherri-message] 保存失败:", a);
    }
  }), e.querySelector("#sherri-reset-btn")?.addEventListener("click", async () => {
    e.querySelector("#sherri-role-offset-x").value = String(t.roleOffsetX), e.querySelector("#sherri-role-offset-y").value = String(t.roleOffsetY), e.querySelector("#sherri-text-left").value = String(t.textLeft), e.querySelector("#sherri-text-right").value = String(t.textRight), e.querySelector("#sherri-text-top").value = String(t.textTop), e.querySelector("#sherri-text-bottom").value = String(t.textBottom), e.querySelector("#sherri-max-font").value = String(t.maxFontSize), e.querySelector("#sherri-min-font").value = String(t.minFontSize), e.querySelector("#sherri-hotkey-enabled").checked = t.hotkey.enabled, e.querySelector("#sherri-hotkey-shift").checked = t.hotkey.shift, e.querySelector("#sherri-hotkey-ctrl").checked = t.hotkey.ctrl, e.querySelector("#sherri-hotkey-alt").checked = t.hotkey.alt, e.querySelector("#sherri-hotkey-key").value = t.hotkey.key, l();
    try {
      typeof window.sherri_message < "u" && (await window.sherri_message.setConfig(t), h = t.hotkey);
    } catch {
    }
    const s = e.querySelector("#sherri-reset-btn"), a = s.textContent;
    s.textContent = "已重置", s.style.background = "#10b981", setTimeout(() => {
      s.textContent = a, s.style.background = "#888";
    }, 1500);
  });
  function l() {
    const s = e.querySelector("#sherri-hotkey-shift").checked, a = e.querySelector("#sherri-hotkey-ctrl").checked, d = e.querySelector("#sherri-hotkey-alt").checked, p = e.querySelector("#sherri-hotkey-key").value, u = `${s ? "Shift+" : ""}${a ? "Ctrl+" : ""}${d ? "Alt+" : ""}${p}`;
    e.querySelector("#sherri-hotkey-display").textContent = u;
  }
  ["#sherri-hotkey-shift", "#sherri-hotkey-ctrl", "#sherri-hotkey-alt", "#sherri-hotkey-key"].forEach((s) => {
    e.querySelector(s)?.addEventListener("change", l);
  }), e.querySelector("#sherri-test-btn")?.addEventListener("click", async () => {
    const s = e.querySelector("#sherri-preview");
    s.innerHTML = '<p style="color: #666;">正在生成预览...</p>';
    try {
      const a = {
        roleOffsetX: parseInt(e.querySelector("#sherri-role-offset-x").value) || 0,
        roleOffsetY: parseInt(e.querySelector("#sherri-role-offset-y").value) || 0,
        textLeft: parseInt(e.querySelector("#sherri-text-left").value) || t.textLeft,
        textRight: parseInt(e.querySelector("#sherri-text-right").value) || t.textRight,
        textTop: parseInt(e.querySelector("#sherri-text-top").value),
        textBottom: parseInt(e.querySelector("#sherri-text-bottom").value) || t.textBottom,
        maxFontSize: parseInt(e.querySelector("#sherri-max-font").value) || t.maxFontSize,
        minFontSize: parseInt(e.querySelector("#sherri-min-font").value) || t.minFontSize
      }, d = parseInt(e.querySelector("#sherri-test-text").value), p = r[d].value, f = (await O(p, a)).toDataURL("image/png");
      s.innerHTML = `<img src="${f}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">`;
    } catch (a) {
      s.innerHTML = `<p style="color: red;">预览失败: ${a.message}</p>`;
    }
  });
};
export {
  he as onSettingWindowCreated
};
