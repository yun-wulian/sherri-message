// Sherri Message - 将文字转换为魔女审判风格图片发送
// 纯前端实现，不依赖 Python

const PLUGIN_PATH = typeof LiteLoader !== 'undefined'
  ? LiteLoader.plugins['sherri-message']?.path?.plugin || ''
  : '';

// 字体加载状态
let fontLoaded = false;
const FONT_NAME = 'SherriFont';

// 加载自定义字体 (使用 CSS @font-face 方式)
async function loadCustomFont() {
  if (fontLoaded) return;

  // 修复 Windows 路径：将反斜杠转换为正斜杠
  const fixedPath = PLUGIN_PATH.replace(/\\/g, '/');
  const fontUrl = `local:///${fixedPath}/dist/assets/font3.ttf`;

  // 通过 CSS @font-face 注入
  if (!document.getElementById('sherri-font-style')) {
    const style = document.createElement('style');
    style.id = 'sherri-font-style';
    style.textContent = `
      @font-face {
        font-family: '${FONT_NAME}';
        src: url('${fontUrl}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
  }

  // 使用 FontFace API 加载
  try {
    const font = new FontFace(FONT_NAME, `url('${fontUrl}')`);
    await font.load();
    document.fonts.add(font);
    fontLoaded = true;
    console.log('[sherri-message] 自定义字体加载成功');
  } catch (err) {
    console.warn('[sherri-message] FontFace 加载失败:', err.message);
    fontLoaded = true;
  }

  // 等待字体实际可用
  try {
    await document.fonts.load(`72px ${FONT_NAME}`);
  } catch (e) {
    console.warn('[sherri-message] 字体等待失败');
  }
}

// 配置 (已应用用户测试的最佳值)
const CONFIG = {
  // 背景图尺寸 (基于 Python 源码坐标)
  canvasWidth: 2400,
  canvasHeight: 900,
  // 背景图数量
  bgCount: 16,
  // 头像数量
  avatarCount: 7,
  // 文字区域 (用户测试优化后的值)
  textArea: {
    left: 700,
    top: 280,
    right: 2339,
    bottom: 750
  },
  // 角色名称配置 (每个字符独立配置，来自 Python 源码)
  roleNameChars: [
    { char: '橘', x: 759, y: 73, fontSize: 186, color: [137, 177, 251] },
    { char: '雪', x: 943, y: 110, fontSize: 147, color: [255, 255, 255] },
    { char: '莉', x: 1093, y: 175, fontSize: 92, color: [255, 255, 255] }
  ],
  // 角色名称偏移 (用户测试优化后的值)
  roleOffsetX: -50,
  roleOffsetY: 50,
  // 文字样式
  textColor: '#FFFFFF',
  shadowColor: '#000000',
  shadowOffset: 4,
  bracketColor: '#F9595E',
  lineSpacing: 1.15,
  maxFontSize: 140,
  minFontSize: 20,
  get fontFamily() {
    return fontLoaded ? `${FONT_NAME}, Microsoft YaHei, sans-serif` : 'Microsoft YaHei, sans-serif';
  }
};

// 加载图片
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 自动换行
function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
  const lines = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const char of para) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// 计算最佳字号
function findBestFontSize(ctx, text, maxWidth, maxHeight) {
  for (let size = CONFIG.maxFontSize; size >= CONFIG.minFontSize; size--) {
    const lines = wrapText(ctx, text, maxWidth, size);
    const totalHeight = lines.length * size * CONFIG.lineSpacing;
    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines };
    }
  }
  return { fontSize: CONFIG.minFontSize, lines: wrapText(ctx, text, maxWidth, CONFIG.minFontSize) };
}

// 解析颜色片段（处理中括号）
function parseColorSegments(text) {
  const segments = [];
  let inBracket = false;
  let buffer = '';

  for (const char of text) {
    if (char === '[' || char === '【') {
      if (buffer) segments.push({ text: buffer, highlight: inBracket });
      segments.push({ text: char, highlight: true });
      buffer = '';
      inBracket = true;
    } else if (char === ']' || char === '】') {
      if (buffer) segments.push({ text: buffer, highlight: true });
      segments.push({ text: char, highlight: true });
      buffer = '';
      inBracket = false;
    } else {
      buffer += char;
    }
  }
  if (buffer) segments.push({ text: buffer, highlight: inBracket });

  return segments;
}

// 绘制角色名称 (每个字符独立位置、大小、颜色)
function drawRoleName(ctx) {
  const shadowOffset = 2;

  for (const charConfig of CONFIG.roleNameChars) {
    const { char, x, y, fontSize, color } = charConfig;
    ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 绘制阴影
    ctx.fillStyle = CONFIG.shadowColor;
    ctx.fillText(char, x + shadowOffset, y + shadowOffset);

    // 绘制文字
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillText(char, x, y);
  }
}

// 绘制带阴影和颜色的文字 (左上对齐)
function drawTextWithShadow(ctx, lines, fontSize, area) {
  // 从区域顶部开始绘制
  let y = area.top + fontSize;

  ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (const line of lines) {
    // 左对齐：从区域左边开始
    let x = area.left;

    const segments = parseColorSegments(line);

    for (const seg of segments) {
      const color = seg.highlight ? CONFIG.bracketColor : CONFIG.textColor;

      // 绘制阴影
      ctx.fillStyle = CONFIG.shadowColor;
      ctx.fillText(seg.text, x + CONFIG.shadowOffset, y + CONFIG.shadowOffset);

      // 绘制文字
      ctx.fillStyle = color;
      ctx.fillText(seg.text, x, y);

      x += ctx.measureText(seg.text).width;
    }

    y += fontSize * CONFIG.lineSpacing;
  }
}

// 从文件读取用户配置 (通过 IPC)
async function getUserConfig() {
  try {
    if (typeof window.sherri_message !== 'undefined') {
      return await window.sherri_message.getConfig();
    }
  } catch (err) {
    console.warn('[sherri-message] 读取配置失败:', err);
  }
  return {};
}

// 生成图片
async function generateImage(text) {
  const userCfg = await getUserConfig();
  return generateImageWithConfig(text, userCfg);
}

// 使用指定配置生成图片
async function generateImageWithConfig(text, userCfg = {}) {
  // 确保字体已加载
  await loadCustomFont();

  const canvas = document.createElement('canvas');
  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;
  const ctx = canvas.getContext('2d');

  // 加载资源
  const fixedPath = PLUGIN_PATH.replace(/\\/g, '/');
  const assetsPath = `local:///${fixedPath}/dist/assets`;

  try {
    // 随机选择背景图 (c1-c16)
    const bgIndex = Math.floor(Math.random() * CONFIG.bgCount) + 1;
    const bgImg = await loadImage(`${assetsPath}/background/c${bgIndex}.png`);
    ctx.drawImage(bgImg, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // 随机选择头像
    const avatarIndex = Math.floor(Math.random() * CONFIG.avatarCount) + 1;
    const avatarImg = await loadImage(`${assetsPath}/sherri/sherri (${avatarIndex}).png`);

    // 绘制头像 - 底部对齐，适配更大的画布
    const avatarMaxWidth = 700;
    const avatarMaxHeight = 850;
    const scale = Math.min(avatarMaxWidth / avatarImg.width, avatarMaxHeight / avatarImg.height);
    const avatarW = avatarImg.width * scale;
    const avatarH = avatarImg.height * scale;
    const avatarX = 20;
    const avatarY = CONFIG.canvasHeight - avatarH;
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarW, avatarH);

    // 绘制角色名称 (应用偏移)
    const roleOffsetX = userCfg.roleOffsetX || 0;
    const roleOffsetY = userCfg.roleOffsetY || 0;
    drawRoleNameWithOffset(ctx, roleOffsetX, roleOffsetY);

    // 计算文字区域 (应用自定义边距)
    const textArea = {
      left: userCfg.textLeft ?? CONFIG.textArea.left,
      top: userCfg.textTop ?? CONFIG.textArea.top,
      right: userCfg.textRight ?? CONFIG.textArea.right,
      bottom: userCfg.textBottom ?? CONFIG.textArea.bottom,
    };
    const maxWidth = textArea.right - textArea.left;
    const maxHeight = textArea.bottom - textArea.top;

    // 应用自定义字号范围
    const maxFontSize = userCfg.maxFontSize ?? CONFIG.maxFontSize;
    const minFontSize = userCfg.minFontSize ?? CONFIG.minFontSize;

    // 计算最佳字号并绘制文字
    const { fontSize, lines } = findBestFontSizeWithRange(ctx, text, maxWidth, maxHeight, maxFontSize, minFontSize);
    drawTextWithShadow(ctx, lines, fontSize, textArea);

    // 压缩输出
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.round(CONFIG.canvasWidth * 0.7);
    outputCanvas.height = Math.round(CONFIG.canvasHeight * 0.7);
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);

    return outputCanvas;
  } catch (err) {
    console.error('[sherri-message] 生成图片失败:', err);
    throw err;
  }
}

// 绘制角色名称 (带偏移)
function drawRoleNameWithOffset(ctx, offsetX, offsetY) {
  const shadowOffset = 2;

  for (const charConfig of CONFIG.roleNameChars) {
    const { char, x, y, fontSize, color } = charConfig;
    ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const drawX = x + offsetX;
    const drawY = y + offsetY;

    // 绘制阴影
    ctx.fillStyle = CONFIG.shadowColor;
    ctx.fillText(char, drawX + shadowOffset, drawY + shadowOffset);

    // 绘制文字
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillText(char, drawX, drawY);
  }
}

// 计算最佳字号 (带自定义范围)
function findBestFontSizeWithRange(ctx, text, maxWidth, maxHeight, maxFontSize, minFontSize) {
  for (let size = maxFontSize; size >= minFontSize; size--) {
    const lines = wrapText(ctx, text, maxWidth, size);
    const totalHeight = lines.length * size * CONFIG.lineSpacing;
    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines };
    }
  }
  return { fontSize: minFontSize, lines: wrapText(ctx, text, maxWidth, minFontSize) };
}

// 复制图片到剪贴板
async function copyImageToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

// 获取输入框文本
function getInputText() {
  const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
  if (!editor) return '';
  return editor.innerText.trim();
}

// 快捷键配置缓存
let hotkeyConfig = {
  enabled: true,
  key: 'Enter',
  shift: true,
  ctrl: false,
  alt: false
};

// 发送 Sherri 消息的核心逻辑
async function sendSherriMessage() {
  const text = getInputText();
  if (!text) {
    showToast('请先输入消息内容', 'warning');
    return;
  }

  try {
    showToast('正在生成图片...', 'info');
    const canvas = await generateImage(text);

    // 将 canvas 转为 Blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // 复制到剪贴板
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    // 清空输入框
    clearInput();

    // 等待一小段时间确保剪贴板写入完成
    await new Promise(r => setTimeout(r, 100));

    // 模拟粘贴到编辑器
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
    if (editor) {
      editor.focus();

      // 创建粘贴事件
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });

      // 添加图片到 clipboardData
      pasteEvent.clipboardData.items.add(new File([blob], 'sherri.png', { type: 'image/png' }));

      editor.dispatchEvent(pasteEvent);

      // 等待图片加载到编辑器
      await new Promise(r => setTimeout(r, 500));

      // 自动点击发送按钮
      const sendBtn = document.querySelector('.send-btn-wrap .send-btn, .send-msg');
      if (sendBtn) {
        sendBtn.click();
        showToast('图片已发送', 'success');
      } else {
        showToast('图片已粘贴，请点击发送', 'success');
      }
    } else {
      showToast('图片已复制到剪贴板，请 Ctrl+V 粘贴发送', 'success');
    }
  } catch (err) {
    console.error('[sherri-message] 错误:', err);
    showToast('生成失败: ' + err.message, 'error');
  }
}

// 检查快捷键是否匹配
function checkHotkey(e) {
  if (!hotkeyConfig.enabled) return false;
  return e.key === hotkeyConfig.key &&
         e.shiftKey === hotkeyConfig.shift &&
         e.ctrlKey === hotkeyConfig.ctrl &&
         e.altKey === hotkeyConfig.alt;
}

// 设置快捷键监听
function setupHotkeyListener() {
  document.addEventListener('keydown', (e) => {
    // 只在编辑器聚焦时触发
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
    if (!editor || !editor.contains(document.activeElement) && document.activeElement !== editor) {
      return;
    }

    if (checkHotkey(e)) {
      e.preventDefault();
      e.stopPropagation();
      sendSherriMessage();
    }
  }, true);

  console.log('[sherri-message] 快捷键监听已设置');
}

// 加载快捷键配置
async function loadHotkeyConfig() {
  try {
    if (typeof window.sherri_message !== 'undefined') {
      const cfg = await window.sherri_message.getConfig() || {};
      if (cfg.hotkey) {
        hotkeyConfig = { ...hotkeyConfig, ...cfg.hotkey };
      }
    }
  } catch (err) {
    console.warn('[sherri-message] 加载快捷键配置失败:', err);
  }
}

// 清空输入框 (使用 CKEditor API)
function clearInput() {
  try {
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
    if (editor && editor.ckeditorInstance) {
      editor.ckeditorInstance.setData('');
      return true;
    }
  } catch (e) {
    console.warn('[sherri-message] CKEditor API 不可用，使用备用方法');
  }

  // 备用方法
  const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
  if (editor) {
    editor.innerHTML = '<p><br></p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// 创建 Sherri 按钮
function createSherriButton() {
  const btn = document.createElement('div');
  btn.className = 'sherri-send-btn';
  btn.innerHTML = `
    <span class="sherri-btn-inner">Sherri !</span>
  `;

  // 添加样式
  if (!document.getElementById('sherri-btn-style')) {
    const style = document.createElement('style');
    style.id = 'sherri-btn-style';
    style.textContent = `
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .sherri-btn-inner:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      }
      @keyframes sherri-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  btn.addEventListener('click', sendSherriMessage);

  return btn;
}

// 显示提示
function showToast(message, type = 'info') {
  const existing = document.getElementById('sherri-toast');
  if (existing) existing.remove();

  const colors = {
    info: '#667eea',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  const toast = document.createElement('div');
  toast.id = 'sherri-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: sherri-toast-in 0.3s ease;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 注入按钮
function injectButton() {
  const operation = document.querySelector('.operation');
  if (!operation) return false;

  // 检查是否已存在
  if (operation.querySelector('.sherri-send-btn')) return true;

  const sendBtnWrap = operation.querySelector('.send-btn-wrap');
  if (!sendBtnWrap) return false;

  const sherriBtn = createSherriButton();

  // 插入到 send-btn-wrap 之前
  sendBtnWrap.parentElement.insertBefore(sherriBtn, sendBtnWrap);

  console.log('[sherri-message] 按钮已注入');
  return true;
}

// 使用 MutationObserver 监听 DOM 变化
function observeDOM() {
  const observer = new MutationObserver(() => {
    injectButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初次尝试注入
  injectButton();
}

// 初始化
async function init() {
  console.log('[sherri-message] 插件已加载');

  // 加载快捷键配置
  await loadHotkeyConfig();

  // 设置快捷键监听
  setupHotkeyListener();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
  } else {
    observeDOM();
  }
}

init();

// 设置页面
export const onSettingWindowCreated = async (view) => {
  // 测试文本选项
  const testTexts = [
    { label: '短文本', value: '这是预览测试文本desuwa' },
    { label: '中等文本', value: '我是丰川祥子，来自魔女审判，这是一段中等长度的测试文本desuwa' },
    { label: '长文本', value: '在遥远的魔法世界里，有一个名叫橘雪莉的魔女审判官，她每天都要处理各种各样的魔法案件，这是一段用于测试自动换行功能的超长文本desuwa' },
    { label: '带括号高亮', value: '我是[橘雪莉]，这里的【括号内容】会以红色高亮显示desuwa' },
    { label: '多行文本', value: '第一行文本\n第二行文本\n第三行文本desuwa' },
  ];

  // 从 IPC 读取配置
  let cfg = {};
  try {
    if (typeof window.sherri_message !== 'undefined') {
      cfg = await window.sherri_message.getConfig() || {};
    }
  } catch (err) {
    console.warn('[sherri-message] 读取配置失败:', err);
  }

  // 默认值
  const defaults = {
    roleOffsetX: -50,
    roleOffsetY: 50,
    textLeft: 700,
    textTop: 280,
    textRight: 2339,
    textBottom: 750,
    maxFontSize: 140,
    minFontSize: 20,
    hotkey: {
      enabled: true,
      key: 'Enter',
      shift: true,
      ctrl: false,
      alt: false
    }
  };

  // 获取快捷键配置
  const hk = cfg.hotkey || defaults.hotkey;

  view.innerHTML = `
    <div style="padding: 20px; max-width: 600px; color: #333;">
      <h2 style="margin-bottom: 16px; color: #667eea;">Sherri Message 设置</h2>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">快捷键设置</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <input type="checkbox" id="sherri-hotkey-enabled" ${hk.enabled ? 'checked' : ''}>
            <span>启用快捷键发送</span>
          </label>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-shift" ${hk.shift ? 'checked' : ''}>
              <span>Shift</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-ctrl" ${hk.ctrl ? 'checked' : ''}>
              <span>Ctrl</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; color: #333;">
              <input type="checkbox" id="sherri-hotkey-alt" ${hk.alt ? 'checked' : ''}>
              <span>Alt</span>
            </label>
            <span style="color: #333;">+</span>
            <select id="sherri-hotkey-key" style="padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
              <option value="Enter" ${hk.key === 'Enter' ? 'selected' : ''}>Enter</option>
              <option value="s" ${hk.key === 's' ? 'selected' : ''}>S</option>
              <option value="d" ${hk.key === 'd' ? 'selected' : ''}>D</option>
              <option value="e" ${hk.key === 'e' ? 'selected' : ''}>E</option>
            </select>
          </div>
          <p style="color: #666; font-size: 12px; margin: 0;">当前快捷键: <span id="sherri-hotkey-display" style="font-weight: bold;">${hk.shift ? 'Shift+' : ''}${hk.ctrl ? 'Ctrl+' : ''}${hk.alt ? 'Alt+' : ''}${hk.key}</span></p>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">角色名称位置偏移</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">X 偏移:</span>
            <input type="number" id="sherri-role-offset-x" value="${cfg.roleOffsetX ?? defaults.roleOffsetX}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">Y 偏移:</span>
            <input type="number" id="sherri-role-offset-y" value="${cfg.roleOffsetY ?? defaults.roleOffsetY}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">文本区域位置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">左边距:</span>
            <input type="number" id="sherri-text-left" value="${cfg.textLeft ?? defaults.textLeft}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">右边距:</span>
            <input type="number" id="sherri-text-right" value="${cfg.textRight ?? defaults.textRight}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">上边距:</span>
            <input type="number" id="sherri-text-top" value="${cfg.textTop ?? defaults.textTop}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">下边距:</span>
            <input type="number" id="sherri-text-bottom" value="${cfg.textBottom ?? defaults.textBottom}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">字体设置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最大字号:</span>
            <input type="number" id="sherri-max-font" value="${cfg.maxFontSize ?? defaults.maxFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最小字号:</span>
            <input type="number" id="sherri-min-font" value="${cfg.minFontSize ?? defaults.minFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">预览测试</h3>
        <label style="display: flex; align-items: center; gap: 8px; color: #333; margin-bottom: 10px;">
          <span style="width: 80px;">测试文本:</span>
          <select id="sherri-test-text" style="flex: 1; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
            ${testTexts.map((t, i) => `<option value="${i}">${t.label}</option>`).join('')}
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
  `;

  // 保存按钮
  view.querySelector('#sherri-save-btn').addEventListener('click', async () => {
    const newCfg = {
      roleOffsetX: parseInt(view.querySelector('#sherri-role-offset-x').value) || 0,
      roleOffsetY: parseInt(view.querySelector('#sherri-role-offset-y').value) || 0,
      textLeft: parseInt(view.querySelector('#sherri-text-left').value) || defaults.textLeft,
      textRight: parseInt(view.querySelector('#sherri-text-right').value) || defaults.textRight,
      textTop: parseInt(view.querySelector('#sherri-text-top').value),
      textBottom: parseInt(view.querySelector('#sherri-text-bottom').value) || defaults.textBottom,
      maxFontSize: parseInt(view.querySelector('#sherri-max-font').value) || defaults.maxFontSize,
      minFontSize: parseInt(view.querySelector('#sherri-min-font').value) || defaults.minFontSize,
      hotkey: {
        enabled: view.querySelector('#sherri-hotkey-enabled').checked,
        key: view.querySelector('#sherri-hotkey-key').value,
        shift: view.querySelector('#sherri-hotkey-shift').checked,
        ctrl: view.querySelector('#sherri-hotkey-ctrl').checked,
        alt: view.querySelector('#sherri-hotkey-alt').checked
      }
    };

    try {
      if (typeof window.sherri_message !== 'undefined') {
        await window.sherri_message.setConfig(newCfg);
        // 更新全局快捷键配置
        hotkeyConfig = newCfg.hotkey;
        // 静默保存，显示短暂的成功提示
        const btn = view.querySelector('#sherri-save-btn');
        const originalText = btn.textContent;
        btn.textContent = '已保存 ✓';
        btn.style.background = '#10b981';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '#667eea';
        }, 1500);
      }
    } catch (err) {
      console.error('[sherri-message] 保存失败:', err);
    }
  });

  // 重置按钮
  view.querySelector('#sherri-reset-btn').addEventListener('click', async () => {
    view.querySelector('#sherri-role-offset-x').value = defaults.roleOffsetX;
    view.querySelector('#sherri-role-offset-y').value = defaults.roleOffsetY;
    view.querySelector('#sherri-text-left').value = defaults.textLeft;
    view.querySelector('#sherri-text-right').value = defaults.textRight;
    view.querySelector('#sherri-text-top').value = defaults.textTop;
    view.querySelector('#sherri-text-bottom').value = defaults.textBottom;
    view.querySelector('#sherri-max-font').value = defaults.maxFontSize;
    view.querySelector('#sherri-min-font').value = defaults.minFontSize;
    view.querySelector('#sherri-hotkey-enabled').checked = defaults.hotkey.enabled;
    view.querySelector('#sherri-hotkey-shift').checked = defaults.hotkey.shift;
    view.querySelector('#sherri-hotkey-ctrl').checked = defaults.hotkey.ctrl;
    view.querySelector('#sherri-hotkey-alt').checked = defaults.hotkey.alt;
    view.querySelector('#sherri-hotkey-key').value = defaults.hotkey.key;
    updateHotkeyDisplay();

    try {
      if (typeof window.sherri_message !== 'undefined') {
        await window.sherri_message.setConfig(defaults);
        hotkeyConfig = defaults.hotkey;
      }
    } catch (err) {}

    // 静默提示
    const btn = view.querySelector('#sherri-reset-btn');
    const originalText = btn.textContent;
    btn.textContent = '已重置 ✓';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '#888';
    }, 1500);
  });

  // 更新快捷键显示
  function updateHotkeyDisplay() {
    const shift = view.querySelector('#sherri-hotkey-shift').checked;
    const ctrl = view.querySelector('#sherri-hotkey-ctrl').checked;
    const alt = view.querySelector('#sherri-hotkey-alt').checked;
    const key = view.querySelector('#sherri-hotkey-key').value;
    const display = `${shift ? 'Shift+' : ''}${ctrl ? 'Ctrl+' : ''}${alt ? 'Alt+' : ''}${key}`;
    view.querySelector('#sherri-hotkey-display').textContent = display;
  }

  // 快捷键选项变化时更新显示
  ['#sherri-hotkey-shift', '#sherri-hotkey-ctrl', '#sherri-hotkey-alt', '#sherri-hotkey-key'].forEach(sel => {
    view.querySelector(sel).addEventListener('change', updateHotkeyDisplay);
  });

  // 测试预览按钮
  view.querySelector('#sherri-test-btn').addEventListener('click', async () => {
    const previewDiv = view.querySelector('#sherri-preview');
    previewDiv.innerHTML = '<p style="color: #666;">正在生成预览...</p>';

    try {
      // 临时应用设置
      const tempCfg = {
        roleOffsetX: parseInt(view.querySelector('#sherri-role-offset-x').value) || 0,
        roleOffsetY: parseInt(view.querySelector('#sherri-role-offset-y').value) || 0,
        textLeft: parseInt(view.querySelector('#sherri-text-left').value) || defaults.textLeft,
        textRight: parseInt(view.querySelector('#sherri-text-right').value) || defaults.textRight,
        textTop: parseInt(view.querySelector('#sherri-text-top').value),
        textBottom: parseInt(view.querySelector('#sherri-text-bottom').value) || defaults.textBottom,
        maxFontSize: parseInt(view.querySelector('#sherri-max-font').value) || defaults.maxFontSize,
        minFontSize: parseInt(view.querySelector('#sherri-min-font').value) || defaults.minFontSize,
      };

      const selectedIndex = parseInt(view.querySelector('#sherri-test-text').value);
      const testText = testTexts[selectedIndex].value;

      const canvas = await generateImageWithConfig(testText, tempCfg);
      const dataUrl = canvas.toDataURL('image/png');
      previewDiv.innerHTML = `<img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">`;
    } catch (err) {
      previewDiv.innerHTML = `<p style="color: red;">预览失败: ${err.message}</p>`;
    }
  });
};
