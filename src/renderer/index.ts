// Sherri Message - 将文字转换为魔女审判风格图片发送
// 适配 QQ 9.9.18+ 版本，不依赖 Euphony

// 类型声明
declare const LiteLoader: {
  plugins: {
    'sherri-message': {
      path: {
        plugin: string;
        data: string;
      };
    };
  };
};

declare const app: Record<string, unknown>;

interface SherriAPI {
  getConfig: () => Promise<Record<string, unknown>>;
  setConfig: (config: Record<string, unknown>) => Promise<boolean>;
  saveTempImage: (base64Data: string) => Promise<string | null>;
  deleteTempFile: (filePath: string) => Promise<boolean>;
  getFileInfo: (filePath: string) => Promise<{ md5: string; size: number } | null>;
  checkFileExists: (filePath: string) => Promise<boolean>;
  getWebContentId: () => number;
  nativeCall: (
    event: { eventName: string; type?: string },
    payload: unknown,
    awaitCallback?: boolean | string | string[]
  ) => Promise<unknown>;
  log: (...args: unknown[]) => void;
  getPreloadLogs: () => string[];
}

declare const window: Window & {
  sherri_message: SherriAPI;
};

// ========== 日志系统 ==========

interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const logBuffer: LogEntry[] = [];
const MAX_LOG_ENTRIES = 100;

function sherriLog(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 0);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  logBuffer.push({ time, level, message });

  // 保持日志数量在限制内
  while (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }

  // 同时输出到控制台
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod('[sherri-message]', ...args);

  // 更新 debug 面板
  updateDebugLogs();
}

function updateDebugLogs(): void {
  // 获取 preload 日志并合并
  try {
    const preloadLogs = window.sherri_message?.getPreloadLogs?.() || [];
    for (const log of preloadLogs) {
      logBuffer.push({ time: '', level: 'info', message: log });
    }
    // 保持日志数量在限制内
    while (logBuffer.length > MAX_LOG_ENTRIES) {
      logBuffer.shift();
    }
  } catch {
    // ignore
  }

  const logsContainer = document.getElementById('sherri-debug-logs');
  if (!logsContainer) return;

  const levelColors = {
    info: '#333',
    warn: '#f59e0b',
    error: '#ef4444'
  };

  logsContainer.innerHTML = logBuffer.map(entry => {
    // preload 日志已经有时间戳
    if (entry.time === '') {
      return `<div style="color: #0066cc; margin-bottom: 2px; word-break: break-all;">${entry.message}</div>`;
    }
    return `<div style="color: ${levelColors[entry.level]}; margin-bottom: 2px; word-break: break-all;">
      <span style="color: #888;">[${entry.time}]</span> ${entry.message}
    </div>`;
  }).join('');

  // 自动滚动到底部
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// ========== 工具函数 ==========

// 预定义要忽略的属性
const IGNORE_PROPS = new Set([
  'dep', '__v_raw', '__v_skip', '_value', '__ob__',
  'prevDep', 'nextDep', 'prevSub', 'nextSub', 'deps', 'subs',
  '__vueParentComponent', 'parent', 'provides',
]);

/**
 * 在对象树中查找指定 key 的最短路径 (BFS)
 * 来自 lite-tools，用于查找 curAioData
 */
function findShortestPathAndValue(
  rootObject: Record<string, unknown>,
  targetKey: string,
  rootName = 'app'
): { path: string; value: unknown; parent: Record<string, unknown> } | null {
  if (!rootObject || typeof rootObject !== 'object') return null;

  const isObject = (o: unknown): o is Record<string, unknown> => o !== null && typeof o === 'object';
  const visited = new WeakSet();
  const queue: { obj: Record<string, unknown>; pathSegments: string[] }[] = [
    { obj: rootObject, pathSegments: [] }
  ];
  visited.add(rootObject);

  const formatSegment = (seg: string): string => {
    if (/^\d+$/.test(seg)) return `[${seg}]`;
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(seg)) return `.${seg}`;
    return `['${seg.replace(/'/g, '\\\'')}']`;
  };

  for (let qi = 0; qi < queue.length; qi++) {
    const { obj, pathSegments } = queue[qi];

    if (isObject(obj) && Object.prototype.hasOwnProperty.call(obj, targetKey)) {
      const value = obj[targetKey];
      const fullPath = rootName + pathSegments.map(formatSegment).join('') + formatSegment(targetKey);
      return { path: fullPath, value, parent: obj };
    }

    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const prop = keys[i];
      if (IGNORE_PROPS.has(prop)) continue;

      const child = obj[prop];
      if (isObject(child) && !visited.has(child)) {
        visited.add(child);
        const newSegments = pathSegments.length ? pathSegments.slice() : [];
        newSegments.push(prop);
        queue.push({ obj: child, pathSegments: newSegments });
      }
    }
  }

  return null;
}

// ========== Peer 管理 ==========

interface Peer {
  chatType: number;  // 1=好友, 2=群聊
  peerUid: string;
  guildId: string;
}

interface CurAioData {
  chatType: number;
  header?: {
    uid?: string;
    uin?: string;
  };
}

let curAioData: CurAioData | null = null;
let peer: Peer | null = null;
const peerChangeListeners: ((peer: Peer) => void)[] = [];

/**
 * 初始化 curAioData 监听
 */
function initCurAioData(): void {
  const findObj = findShortestPathAndValue(app as Record<string, unknown>, 'curAioData');
  if (!findObj?.value || !(findObj.value as CurAioData).chatType) {
    setTimeout(initCurAioData, 500);
    sherriLog('info', '等待 curAioData 初始化...');
    return;
  }

  sherriLog('info', '找到 curAioData:', findObj.path);
  curAioData = findObj.value as CurAioData;

  // 使用 defineProperty 监听变化
  Object.defineProperty(findObj.parent, 'curAioData', {
    enumerable: true,
    configurable: true,
    get() {
      return curAioData;
    },
    set(newVal: CurAioData) {
      sherriLog('info', 'curAioData 更新:', newVal);
      curAioData = newVal;
      emitPeerChange();
    },
  });

  emitPeerChange();
}

function emitPeerChange(): void {
  if (!curAioData) return;

  peer = {
    chatType: curAioData.chatType,
    peerUid: curAioData.header?.uid || '',
    guildId: '',
  };

  sherriLog('info', 'peer 更新:', peer);

  peerChangeListeners.forEach((func) => {
    func(peer!);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addPeerChangeListener(func: (peer: Peer) => void): void {
  peerChangeListeners.push(func);
}

function getPeer(): Peer | null {
  return peer;
}

// ========== Native 调用封装 ==========

/**
 * 获取文件名
 */
function getFileName(filePath: string): string {
  if (typeof filePath !== 'string') return '';
  const trimmed = filePath.replace(/[/\\]+$/, '');
  if (trimmed === '') return '';
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const name = idx === -1 ? trimmed : trimmed.slice(idx + 1);
  if (/^[A-Za-z]:$/.test(name)) return '';
  return name;
}

/**
 * 构建图片消息元素
 * 完全按照 lite-tools 的流程来实现
 * 备用方案，当前使用粘贴模式
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function buildImageElement(imagePath: string, picSubType = 0): Promise<unknown> {
  const api = window.sherri_message;

  sherriLog('info', '=== 开始构建图片元素 ===');
  sherriLog('info', '源路径:', imagePath);

  // 步骤1: 先获取源文件类型 (与 lite-tools 一致)
  sherriLog('info', '[步骤1] 获取源文件类型...');
  await api.nativeCall(
    { type: 'request', eventName: 'FileApi' },
    { cmdName: 'getFileType', cmdType: 'invoke', payload: [imagePath] },
    true
  );
  sherriLog('info', '[步骤1] 完成');

  // 步骤2: 调用 copyFileWithDelExifInfo 将文件复制到 QQ 内部目录
  sherriLog('info', '[步骤2] 调用 copyFileWithDelExifInfo...');
  const copyResult = await api.nativeCall(
    { eventName: 'ntApi', type: 'request' },
    {
      cmdName: 'nodeIKernelMsgService/copyFileWithDelExifInfo',
      cmdType: 'invoke',
      payload: [
        {
          sourcePath: imagePath,
          elementSubType: 1,
        },
        null,
      ],
    },
    true
  ) as { newPath: string; md5: string; error?: number; errorMsg?: string };
  sherriLog('info', '[步骤2] copyFileWithDelExifInfo 返回:', JSON.stringify(copyResult));

  if (copyResult?.error || !copyResult?.newPath) {
    sherriLog('error', '[步骤2] 失败:', copyResult?.errorMsg);
    throw new Error('copyFileWithDelExifInfo 失败: ' + (copyResult?.errorMsg || '未知错误'));
  }

  const finalPath = copyResult.newPath;
  const md5 = copyResult.md5 || '';
  sherriLog('info', '[步骤2] newPath:', finalPath);
  sherriLog('info', '[步骤2] md5:', md5);

  // 步骤3: 获取复制后文件的类型 (lite-tools 在 copy 后再次获取)
  sherriLog('info', '[步骤3] 获取复制后文件类型...');
  const fileType = await api.nativeCall(
    { type: 'request', eventName: 'FileApi' },
    { cmdName: 'getFileType', cmdType: 'invoke', payload: [finalPath] },
    true
  ) as { ext: string };
  sherriLog('info', '[步骤3] 文件类型:', JSON.stringify(fileType));

  // 步骤4: 获取复制后文件的图片尺寸 (lite-tools 对 newPath 获取)
  sherriLog('info', '[步骤4] 获取图片尺寸...');
  const imageSize = await api.nativeCall(
    { type: 'request', eventName: 'FileApi' },
    { cmdName: 'getImageSizeFromPath', cmdType: 'invoke', payload: [finalPath] },
    true
  ) as { width: number; height: number };
  sherriLog('info', '[步骤4] 图片尺寸:', JSON.stringify(imageSize));

  // 步骤5: 获取 MD5 (lite-tools 调用但不 await，我们也调用一下触发)
  sherriLog('info', '[步骤5] 调用 getFileMd5...');
  api.nativeCall(
    { type: 'request', eventName: 'FileApi' },
    { cmdName: 'getFileMd5', cmdType: 'invoke', payload: [finalPath] }
  );
  sherriLog('info', '[步骤5] 已触发 (不等待)');

  // 步骤6: 获取文件大小
  sherriLog('info', '[步骤6] 获取文件大小...');
  const fileSize = await api.nativeCall(
    { type: 'request', eventName: 'FileApi' },
    { cmdName: 'getFileSize', cmdType: 'invoke', payload: [finalPath] },
    true
  ) as number;
  sherriLog('info', '[步骤6] 文件大小:', fileSize);

  const fileName = getFileName(finalPath);
  sherriLog('info', '文件名:', fileName);

  // 构建 picElement (完全按照 lite-tools 的结构)
  const picElement = {
    md5HexStr: md5,
    picWidth: imageSize.width,
    picHeight: imageSize.height,
    fileName: fileName,
    fileSize: fileSize,
    original: true,
    picType: fileType.ext === 'gif' ? 2000 : 1000,
    picSubType: picSubType,
    sourcePath: finalPath,
    fileUuid: '',
    fileSubId: '',
    thumbFileSize: 0,
    thumbPath: undefined,
    summary: '',
  };

  sherriLog('info', '=== picElement 构建完成 ===');
  sherriLog('info', JSON.stringify(picElement, null, 2));

  // 方案2: 使用空字符串作为 extBufForUI
  const element = {
    elementType: 2,
    elementId: '',
    extBufForUI: '',
    picElement,
  };

  sherriLog('info', '最终 element (extBufForUI=""):', JSON.stringify(element));

  return element;
}

/**
 * 发送消息
 * 备用方案，当前使用粘贴模式
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendMessage(targetPeer: Peer, elements: unknown[]): Promise<void> {
  const api = window.sherri_message;

  sherriLog('info', '发送消息, peer:', targetPeer, 'elements:', elements);

  await api.nativeCall(
    { eventName: 'ntApi', type: 'request' },
    {
      cmdName: 'nodeIKernelMsgService/sendMsg',
      cmdType: 'invoke',
      payload: [
        {
          msgId: '0',
          peer: targetPeer,
          msgElements: elements,
          msgAttributeInfos: new Map(),
        },
        null,
      ],
    }
  );
}

// ========== 图片生成 ==========

const PLUGIN_PATH = typeof LiteLoader !== 'undefined'
  ? LiteLoader.plugins['sherri-message']?.path?.plugin || ''
  : '';

let fontLoaded = false;
const FONT_NAME = 'SherriFont';

const CONFIG = {
  canvasWidth: 2400,
  canvasHeight: 900,
  bgCount: 16,
  avatarCount: 7,
  textArea: { left: 700, top: 280, right: 2339, bottom: 750 },
  roleNameChars: [
    { char: '橘', x: 759, y: 73, fontSize: 186, color: [137, 177, 251] },
    { char: '雪', x: 943, y: 110, fontSize: 147, color: [255, 255, 255] },
    { char: '莉', x: 1093, y: 175, fontSize: 92, color: [255, 255, 255] }
  ],
  roleOffsetX: -50,
  roleOffsetY: 50,
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

async function loadCustomFont(): Promise<void> {
  if (fontLoaded) return;

  const fixedPath = PLUGIN_PATH.replace(/\\/g, '/');
  const fontUrl = `local:///${fixedPath}/dist/assets/font3.ttf`;

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

  try {
    const font = new FontFace(FONT_NAME, `url('${fontUrl}')`);
    await font.load();
    document.fonts.add(font);
    fontLoaded = true;
    sherriLog('info', '自定义字体加载成功');
  } catch (err) {
    sherriLog('warn', 'FontFace 加载失败:', err);
    fontLoaded = true;
  }

  try {
    await document.fonts.load(`72px ${FONT_NAME}`);
  } catch {
    sherriLog('warn', '字体等待失败');
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
  ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
  const lines: string[] = [];
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

function findBestFontSizeWithRange(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  minFontSize: number
): { fontSize: number; lines: string[] } {
  for (let size = maxFontSize; size >= minFontSize; size--) {
    const lines = wrapText(ctx, text, maxWidth, size);
    const totalHeight = lines.length * size * CONFIG.lineSpacing;
    if (totalHeight <= maxHeight) {
      return { fontSize: size, lines };
    }
  }
  return { fontSize: minFontSize, lines: wrapText(ctx, text, maxWidth, minFontSize) };
}

function parseColorSegments(text: string): { text: string; highlight: boolean }[] {
  const segments: { text: string; highlight: boolean }[] = [];
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

function drawRoleNameWithOffset(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
  const shadowOffset = 2;

  for (const charConfig of CONFIG.roleNameChars) {
    const { char, x, y, fontSize, color } = charConfig;
    ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const drawX = x + offsetX;
    const drawY = y + offsetY;

    ctx.fillStyle = CONFIG.shadowColor;
    ctx.fillText(char, drawX + shadowOffset, drawY + shadowOffset);

    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillText(char, drawX, drawY);
  }
}

function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontSize: number,
  area: { left: number; top: number; right: number; bottom: number }
): void {
  let y = area.top + fontSize;

  ctx.font = `${fontSize}px ${CONFIG.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (const line of lines) {
    let x = area.left;
    const segments = parseColorSegments(line);

    for (const seg of segments) {
      const color = seg.highlight ? CONFIG.bracketColor : CONFIG.textColor;

      ctx.fillStyle = CONFIG.shadowColor;
      ctx.fillText(seg.text, x + CONFIG.shadowOffset, y + CONFIG.shadowOffset);

      ctx.fillStyle = color;
      ctx.fillText(seg.text, x, y);

      x += ctx.measureText(seg.text).width;
    }

    y += fontSize * CONFIG.lineSpacing;
  }
}

async function getUserConfig(): Promise<Record<string, unknown>> {
  try {
    if (typeof window.sherri_message !== 'undefined') {
      return await window.sherri_message.getConfig();
    }
  } catch (err) {
    sherriLog('warn', '读取配置失败:', err);
  }
  return {};
}

async function generateImageWithConfig(text: string, userCfg: Record<string, unknown> = {}): Promise<HTMLCanvasElement> {
  await loadCustomFont();

  const canvas = document.createElement('canvas');
  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;
  const ctx = canvas.getContext('2d')!;

  const fixedPath = PLUGIN_PATH.replace(/\\/g, '/');
  const assetsPath = `local:///${fixedPath}/dist/assets`;

  try {
    const bgIndex = Math.floor(Math.random() * CONFIG.bgCount) + 1;
    const bgImg = await loadImage(`${assetsPath}/background/c${bgIndex}.png`);
    ctx.drawImage(bgImg, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    const avatarIndex = Math.floor(Math.random() * CONFIG.avatarCount) + 1;
    const avatarImg = await loadImage(`${assetsPath}/sherri/sherri (${avatarIndex}).png`);

    const avatarMaxWidth = 700;
    const avatarMaxHeight = 850;
    const scale = Math.min(avatarMaxWidth / avatarImg.width, avatarMaxHeight / avatarImg.height);
    const avatarW = avatarImg.width * scale;
    const avatarH = avatarImg.height * scale;
    const avatarX = 20;
    const avatarY = CONFIG.canvasHeight - avatarH;
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarW, avatarH);

    const roleOffsetX = (userCfg.roleOffsetX as number) || 0;
    const roleOffsetY = (userCfg.roleOffsetY as number) || 0;
    drawRoleNameWithOffset(ctx, roleOffsetX, roleOffsetY);

    const textArea = {
      left: (userCfg.textLeft as number) ?? CONFIG.textArea.left,
      top: (userCfg.textTop as number) ?? CONFIG.textArea.top,
      right: (userCfg.textRight as number) ?? CONFIG.textArea.right,
      bottom: (userCfg.textBottom as number) ?? CONFIG.textArea.bottom,
    };
    const maxWidth = textArea.right - textArea.left;
    const maxHeight = textArea.bottom - textArea.top;

    const maxFontSize = (userCfg.maxFontSize as number) ?? CONFIG.maxFontSize;
    const minFontSize = (userCfg.minFontSize as number) ?? CONFIG.minFontSize;

    const { fontSize, lines } = findBestFontSizeWithRange(ctx, text, maxWidth, maxHeight, maxFontSize, minFontSize);
    drawTextWithShadow(ctx, lines, fontSize, textArea);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.round(CONFIG.canvasWidth * 0.7);
    outputCanvas.height = Math.round(CONFIG.canvasHeight * 0.7);
    const outputCtx = outputCanvas.getContext('2d')!;
    outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);

    return outputCanvas;
  } catch (err) {
    sherriLog('error', '生成图片失败:', err);
    throw err;
  }
}

async function generateImage(text: string): Promise<HTMLCanvasElement> {
  const userCfg = await getUserConfig();
  return generateImageWithConfig(text, userCfg);
}

// ========== UI 相关 ==========

function getInputText(): string {
  const editor = document.querySelector('.ck.ck-content.ck-editor__editable') as HTMLElement | null;
  if (!editor) return '';
  return editor.innerText.trim();
}

function clearInput(): void {
  try {
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable') as HTMLElement & { ckeditorInstance?: { setData: (data: string) => void } };
    if (editor && editor.ckeditorInstance) {
      editor.ckeditorInstance.setData('');
      return;
    }
  } catch {
    sherriLog('warn', 'CKEditor API 不可用，使用备用方法');
  }

  const editor = document.querySelector('.ck.ck-content.ck-editor__editable') as HTMLElement | null;
  if (editor) {
    editor.innerHTML = '<p><br></p>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
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

// ========== 核心发送逻辑 ==========

/**
 * 剪贴板数据缓存
 */
interface ClipboardCache {
  type: 'text' | 'image' | 'html' | 'empty';
  text?: string;
  html?: string;
  imageBlob?: Blob;
}

/**
 * 保存当前剪贴板内容
 */
async function saveClipboard(): Promise<ClipboardCache> {
  try {
    // 尝试读取剪贴板
    const items = await navigator.clipboard.read();

    for (const item of items) {
      // 优先检查图片
      if (item.types.includes('image/png')) {
        const blob = await item.getType('image/png');
        sherriLog('info', '保存剪贴板: 图片, 大小:', blob.size);
        return { type: 'image', imageBlob: blob };
      }
      if (item.types.includes('image/jpeg')) {
        const blob = await item.getType('image/jpeg');
        sherriLog('info', '保存剪贴板: JPEG图片, 大小:', blob.size);
        return { type: 'image', imageBlob: blob };
      }

      // 检查 HTML
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        const html = await blob.text();
        sherriLog('info', '保存剪贴板: HTML, 长度:', html.length);
        return { type: 'html', html };
      }

      // 检查纯文本
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        sherriLog('info', '保存剪贴板: 文本, 长度:', text.length);
        return { type: 'text', text };
      }
    }

    sherriLog('info', '剪贴板为空或格式不支持');
    return { type: 'empty' };
  } catch (err) {
    sherriLog('warn', '读取剪贴板失败:', err);
    return { type: 'empty' };
  }
}

/**
 * 恢复剪贴板内容
 */
async function restoreClipboard(cache: ClipboardCache): Promise<void> {
  try {
    if (cache.type === 'empty') {
      sherriLog('info', '剪贴板原本为空，跳过恢复');
      return;
    }

    if (cache.type === 'image' && cache.imageBlob) {
      const item = new ClipboardItem({
        [cache.imageBlob.type]: cache.imageBlob
      });
      await navigator.clipboard.write([item]);
      sherriLog('info', '剪贴板已恢复: 图片');
      return;
    }

    if (cache.type === 'html' && cache.html) {
      // HTML 需要同时写入 text/html 和 text/plain
      const htmlBlob = new Blob([cache.html], { type: 'text/html' });
      // 从 HTML 中提取纯文本作为备用
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cache.html;
      const plainText = tempDiv.textContent || '';
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });
      await navigator.clipboard.write([item]);
      sherriLog('info', '剪贴板已恢复: HTML');
      return;
    }

    if (cache.type === 'text' && cache.text) {
      await navigator.clipboard.writeText(cache.text);
      sherriLog('info', '剪贴板已恢复: 文本');
      return;
    }

    sherriLog('warn', '无法恢复剪贴板，缓存数据不完整');
  } catch (err) {
    sherriLog('error', '恢复剪贴板失败:', err);
  }
}

/**
 * 将图片粘贴到 CKEditor
 * 使用 Clipboard API 写入剪贴板，然后触发粘贴
 */
async function pasteImageToEditor(canvas: HTMLCanvasElement): Promise<boolean> {
  const editor = document.querySelector('.ck.ck-content.ck-editor__editable') as HTMLElement | null;
  if (!editor) {
    sherriLog('error', '找不到编辑器');
    return false;
  }

  try {
    // 将 canvas 转为 Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) {
      sherriLog('error', 'canvas.toBlob 返回 null');
      return false;
    }

    sherriLog('info', '图片 Blob 大小:', blob.size);

    // 聚焦编辑器
    editor.focus();
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用 Clipboard API 写入剪贴板
    try {
      const clipboardItem = new ClipboardItem({
        'image/png': blob
      });
      await navigator.clipboard.write([clipboardItem]);
      sherriLog('info', '图片已写入剪贴板');
    } catch (clipErr) {
      sherriLog('error', 'Clipboard API 写入失败:', clipErr);
      return false;
    }

    // 等待一帧
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 触发 Ctrl+V 粘贴
    const pasteEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(pasteEvent);
    sherriLog('info', '已触发 Ctrl+V');

    // 同时尝试 execCommand
    try {
      document.execCommand('paste');
      sherriLog('info', 'execCommand paste 执行');
    } catch {
      sherriLog('warn', 'execCommand paste 不支持');
    }

    // 等待粘贴处理
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
  } catch (err) {
    sherriLog('error', '粘贴图片失败:', err);
    return false;
  }
}

/**
 * 点击发送按钮
 */
function clickSendButton(): boolean {
  // 尝试多种可能的发送按钮选择器
  // 注意：排除我们自己的 sherri-send-btn
  const selectors = [
    '.send-btn-wrap .send-btn',
    '.send-btn-wrap button',
    '.operation .send-btn:not(.sherri-send-btn)',
  ];

  for (const selector of selectors) {
    const sendBtn = document.querySelector(selector) as HTMLElement | null;
    // 确保不是我们自己的按钮
    if (sendBtn && !sendBtn.classList.contains('sherri-send-btn') && !sendBtn.closest('.sherri-send-btn')) {
      sherriLog('info', '找到发送按钮:', selector, 'className:', sendBtn.className);
      sendBtn.click();
      sherriLog('info', '已点击发送按钮');
      return true;
    }
  }

  // 最后尝试：查找 .send-btn-wrap 内的任何可点击元素
  const sendBtnWrap = document.querySelector('.send-btn-wrap');
  if (sendBtnWrap) {
    const children = sendBtnWrap.querySelectorAll('*');
    for (const child of children) {
      const el = child as HTMLElement;
      if (el.tagName === 'BUTTON' || el.classList.contains('send-btn') || el.getAttribute('role') === 'button') {
        sherriLog('info', '找到发送按钮 (fallback):', el.tagName, el.className);
        el.click();
        return true;
      }
    }
  }

  sherriLog('error', '找不到发送按钮');
  return false;
}

async function sendSherriMessage(): Promise<void> {
  sherriLog('info', '开始 sendSherriMessage (粘贴模式)');
  const text = getInputText();
  if (!text) {
    showToast('请先输入消息内容', 'warning');
    return;
  }

  sherriLog('info', '输入文本:', text);

  // 保存当前剪贴板内容
  sherriLog('info', '保存剪贴板内容...');
  const clipboardCache = await saveClipboard();

  try {
    showToast('正在生成图片...', 'info');
    sherriLog('info', '开始生成图片...');
    const canvas = await generateImage(text);
    sherriLog('info', '图片生成完成, canvas:', canvas.width, 'x', canvas.height);

    // 清空输入框（粘贴前先清空，避免文字和图片一起发送）
    clearInput();

    // 粘贴图片到编辑器
    sherriLog('info', '粘贴图片到编辑器...');
    const pasteSuccess = await pasteImageToEditor(canvas);
    if (!pasteSuccess) {
      showToast('粘贴图片失败', 'error');
      // 恢复剪贴板
      await restoreClipboard(clipboardCache);
      return;
    }

    // 等待图片上传处理
    sherriLog('info', '等待图片处理...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // 点击发送按钮
    sherriLog('info', '点击发送按钮...');
    const sendSuccess = clickSendButton();
    if (!sendSuccess) {
      showToast('找不到发送按钮', 'error');
      // 恢复剪贴板
      await restoreClipboard(clipboardCache);
      return;
    }

    showToast('图片已发送', 'success');
    sherriLog('info', '发送完成');

    // 等待一小段时间确保发送完成，然后恢复剪贴板
    await new Promise(resolve => setTimeout(resolve, 300));
    sherriLog('info', '恢复剪贴板内容...');
    await restoreClipboard(clipboardCache);

  } catch (err) {
    sherriLog('error', '发送失败:', err);
    showToast('发送失败: ' + (err as Error).message, 'error');
    // 恢复剪贴板
    await restoreClipboard(clipboardCache);
  }
}

// ========== 快捷键 ==========

let hotkeyConfig = {
  enabled: true,
  key: 'Enter',
  shift: true,
  ctrl: false,
  alt: false
};

function checkHotkey(e: KeyboardEvent): boolean {
  if (!hotkeyConfig.enabled) return false;
  return e.key === hotkeyConfig.key &&
         e.shiftKey === hotkeyConfig.shift &&
         e.ctrlKey === hotkeyConfig.ctrl &&
         e.altKey === hotkeyConfig.alt;
}

function setupHotkeyListener(): void {
  document.addEventListener('keydown', (e) => {
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
    if (!editor || (!editor.contains(document.activeElement) && document.activeElement !== editor)) {
      return;
    }

    if (checkHotkey(e)) {
      e.preventDefault();
      e.stopPropagation();
      sendSherriMessage();
    }
  }, true);

  sherriLog('info', '快捷键监听已设置');
}

async function loadHotkeyConfig(): Promise<void> {
  try {
    if (typeof window.sherri_message !== 'undefined') {
      const cfg = await window.sherri_message.getConfig() || {};
      if (cfg.hotkey) {
        hotkeyConfig = { ...hotkeyConfig, ...(cfg.hotkey as typeof hotkeyConfig) };
      }
    }
  } catch (err) {
    sherriLog('warn', '加载快捷键配置失败:', err);
  }
}

// ========== 按钮注入 ==========

function createSherriButton(): HTMLElement {
  const btn = document.createElement('div');
  btn.className = 'sherri-send-btn';
  btn.innerHTML = '<span class="sherri-btn-inner">Sherri !</span>';

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
    `;
    document.head.appendChild(style);
  }

  function updateBtnState(): void {
    const text = getInputText();
    const inner = btn.querySelector('.sherri-btn-inner');
    if (inner) {
      if (text) {
        inner.classList.remove('disabled');
      } else {
        inner.classList.add('disabled');
      }
    }
  }

  const observer = new MutationObserver(updateBtnState);
  const checkEditor = (): void => {
    const editor = document.querySelector('.ck.ck-content.ck-editor__editable');
    if (editor) {
      observer.observe(editor, { childList: true, subtree: true, characterData: true });
      editor.addEventListener('input', updateBtnState);
      updateBtnState();
    }
  };
  checkEditor();
  setTimeout(checkEditor, 500);

  btn.addEventListener('click', sendSherriMessage);

  return btn;
}

function injectButton(): boolean {
  const operation = document.querySelector('.operation');
  if (!operation) return false;

  if (operation.querySelector('.sherri-send-btn')) return true;

  const sendBtnWrap = operation.querySelector('.send-btn-wrap');
  if (!sendBtnWrap) return false;

  const sherriBtn = createSherriButton();
  sendBtnWrap.parentElement?.insertBefore(sherriBtn, sendBtnWrap);

  sherriLog('info', '按钮已注入');
  return true;
}

function observeDOM(): void {
  const observer = new MutationObserver(() => {
    injectButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  injectButton();
}

// ========== 调试面板 ==========

function createDebugPanel(): void {
  if (document.getElementById('sherri-debug-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'sherri-debug-panel';
  panel.innerHTML = `
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
  `;

  panel.style.cssText = `
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
  `;

  document.body.appendChild(panel);

  // 拖动功能
  const header = panel.querySelector('#sherri-debug-header') as HTMLElement;
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).id === 'sherri-debug-close') return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  panel.querySelector('#sherri-debug-close')?.addEventListener('click', () => {
    panel.remove();
  });

  panel.querySelector('#sherri-debug-refresh')?.addEventListener('click', () => {
    updateDebugLogs();
    updateDebugInfo();
  });

  panel.querySelector('#sherri-debug-clear-logs')?.addEventListener('click', () => {
    logBuffer.length = 0;
    updateDebugLogs();
  });

  updateDebugInfo();
  updateDebugLogs();

  // 定期更新状态和日志
  setInterval(() => {
    updateDebugInfo();
    updateDebugLogs();
  }, 1000);
}

function updateDebugInfo(): void {
  const content = document.getElementById('sherri-debug-content');
  if (!content) return;

  const info: string[] = [];
  const currentPeer = getPeer();

  info.push('<b>== Peer 信息 (渲染进程) ==</b>');
  info.push(`chatType: ${currentPeer?.chatType ?? '❌ null'} (1=好友, 2=群聊)`);
  info.push(`peerUid: ${currentPeer?.peerUid || '❌ 空'}`);

  if (currentPeer?.chatType && currentPeer?.peerUid) {
    info.push('<b style="color:green">peer 信息完整，可以发送消息</b>');
  } else {
    info.push('<b style="color:orange">请切换到一个聊天窗口</b>');
  }

  info.push('<br><b>== 基础检查 ==</b>');
  info.push(`webContentId: ${window.sherri_message?.getWebContentId?.() ?? '❌'}`);
  info.push(`sherri_message API: ${typeof window.sherri_message !== 'undefined' ? '' : '❌'}`);
  info.push(`nativeCall: ${typeof window.sherri_message?.nativeCall === 'function' ? '' : '❌'}`);

  info.push('<br><b>== 聊天窗口 ==</b>');
  const chatInput = document.querySelector('.chat-input-area');
  info.push(`聊天输入区域: ${chatInput ? '' : '❌'}`);

  const msgList = document.querySelector('.ml-list');
  info.push(`消息列表: ${msgList ? '' : '❌'}`);

  content.innerHTML = info.join('<br>');
}

// ========== 初始化 ==========

async function init(): Promise<void> {
  sherriLog('info', '插件已加载 (v2 - 新版 QQ 适配)');

  // 初始化 curAioData 监听
  initCurAioData();

  // 加载快捷键配置
  await loadHotkeyConfig();

  // 设置快捷键监听
  setupHotkeyListener();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
  } else {
    observeDOM();
  }

  // 延迟创建调试面板
  setTimeout(createDebugPanel, 2000);
}

init();

// ========== 设置页面 ==========

export const onSettingWindowCreated = async (view: HTMLElement): Promise<void> => {
  const testTexts = [
    { label: '短文本', value: '这是预览测试文本desuwa' },
    { label: '中等文本', value: '我是丰川祥子，来自魔女审判，这是一段中等长度的测试文本desuwa' },
    { label: '长文本', value: '在遥远的魔法世界里，有一个名叫橘雪莉的魔女审判官，她每天都要处理各种各样的魔法案件，这是一段用于测试自动换行功能的超长文本desuwa' },
    { label: '带括号高亮', value: '我是[橘雪莉]，这里的【括号内容】会以红色高亮显示desuwa' },
    { label: '多行文本', value: '第一行文本\n第二行文本\n第三行文本desuwa' },
  ];

  let cfg: Record<string, unknown> = {};
  try {
    if (typeof window.sherri_message !== 'undefined') {
      cfg = await window.sherri_message.getConfig() || {};
    }
  } catch (err) {
    console.warn('[sherri-message] 读取配置失败:', err);
  }

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

  const hk = (cfg.hotkey as typeof defaults.hotkey) || defaults.hotkey;

  view.innerHTML = `
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
            <input type="number" id="sherri-role-offset-x" value="${(cfg.roleOffsetX as number) ?? defaults.roleOffsetX}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">Y 偏移:</span>
            <input type="number" id="sherri-role-offset-y" value="${(cfg.roleOffsetY as number) ?? defaults.roleOffsetY}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">文本区域位置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">左边距:</span>
            <input type="number" id="sherri-text-left" value="${(cfg.textLeft as number) ?? defaults.textLeft}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">右边距:</span>
            <input type="number" id="sherri-text-right" value="${(cfg.textRight as number) ?? defaults.textRight}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">上边距:</span>
            <input type="number" id="sherri-text-top" value="${(cfg.textTop as number) ?? defaults.textTop}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">下边距:</span>
            <input type="number" id="sherri-text-bottom" value="${(cfg.textBottom as number) ?? defaults.textBottom}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px; font-size: 14px; color: #333;">字体设置</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最大字号:</span>
            <input type="number" id="sherri-max-font" value="${(cfg.maxFontSize as number) ?? defaults.maxFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
          </label>
          <label style="display: flex; align-items: center; gap: 8px; color: #333;">
            <span style="width: 80px;">最小字号:</span>
            <input type="number" id="sherri-min-font" value="${(cfg.minFontSize as number) ?? defaults.minFontSize}" style="width: 80px; padding: 4px; color: #333; background: #fff; border: 1px solid #ccc;">
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
  view.querySelector('#sherri-save-btn')?.addEventListener('click', async () => {
    const newCfg = {
      roleOffsetX: parseInt((view.querySelector('#sherri-role-offset-x') as HTMLInputElement).value) || 0,
      roleOffsetY: parseInt((view.querySelector('#sherri-role-offset-y') as HTMLInputElement).value) || 0,
      textLeft: parseInt((view.querySelector('#sherri-text-left') as HTMLInputElement).value) || defaults.textLeft,
      textRight: parseInt((view.querySelector('#sherri-text-right') as HTMLInputElement).value) || defaults.textRight,
      textTop: parseInt((view.querySelector('#sherri-text-top') as HTMLInputElement).value),
      textBottom: parseInt((view.querySelector('#sherri-text-bottom') as HTMLInputElement).value) || defaults.textBottom,
      maxFontSize: parseInt((view.querySelector('#sherri-max-font') as HTMLInputElement).value) || defaults.maxFontSize,
      minFontSize: parseInt((view.querySelector('#sherri-min-font') as HTMLInputElement).value) || defaults.minFontSize,
      hotkey: {
        enabled: (view.querySelector('#sherri-hotkey-enabled') as HTMLInputElement).checked,
        key: (view.querySelector('#sherri-hotkey-key') as HTMLSelectElement).value,
        shift: (view.querySelector('#sherri-hotkey-shift') as HTMLInputElement).checked,
        ctrl: (view.querySelector('#sherri-hotkey-ctrl') as HTMLInputElement).checked,
        alt: (view.querySelector('#sherri-hotkey-alt') as HTMLInputElement).checked
      }
    };

    try {
      if (typeof window.sherri_message !== 'undefined') {
        await window.sherri_message.setConfig(newCfg);
        hotkeyConfig = newCfg.hotkey;
        const btn = view.querySelector('#sherri-save-btn') as HTMLButtonElement;
        const originalText = btn.textContent;
        btn.textContent = '已保存';
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
  view.querySelector('#sherri-reset-btn')?.addEventListener('click', async () => {
    (view.querySelector('#sherri-role-offset-x') as HTMLInputElement).value = String(defaults.roleOffsetX);
    (view.querySelector('#sherri-role-offset-y') as HTMLInputElement).value = String(defaults.roleOffsetY);
    (view.querySelector('#sherri-text-left') as HTMLInputElement).value = String(defaults.textLeft);
    (view.querySelector('#sherri-text-right') as HTMLInputElement).value = String(defaults.textRight);
    (view.querySelector('#sherri-text-top') as HTMLInputElement).value = String(defaults.textTop);
    (view.querySelector('#sherri-text-bottom') as HTMLInputElement).value = String(defaults.textBottom);
    (view.querySelector('#sherri-max-font') as HTMLInputElement).value = String(defaults.maxFontSize);
    (view.querySelector('#sherri-min-font') as HTMLInputElement).value = String(defaults.minFontSize);
    (view.querySelector('#sherri-hotkey-enabled') as HTMLInputElement).checked = defaults.hotkey.enabled;
    (view.querySelector('#sherri-hotkey-shift') as HTMLInputElement).checked = defaults.hotkey.shift;
    (view.querySelector('#sherri-hotkey-ctrl') as HTMLInputElement).checked = defaults.hotkey.ctrl;
    (view.querySelector('#sherri-hotkey-alt') as HTMLInputElement).checked = defaults.hotkey.alt;
    (view.querySelector('#sherri-hotkey-key') as HTMLSelectElement).value = defaults.hotkey.key;
    updateHotkeyDisplay();

    try {
      if (typeof window.sherri_message !== 'undefined') {
        await window.sherri_message.setConfig(defaults);
        hotkeyConfig = defaults.hotkey;
      }
    } catch { /* ignore */ }

    const btn = view.querySelector('#sherri-reset-btn') as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.textContent = '已重置';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '#888';
    }, 1500);
  });

  function updateHotkeyDisplay(): void {
    const shift = (view.querySelector('#sherri-hotkey-shift') as HTMLInputElement).checked;
    const ctrl = (view.querySelector('#sherri-hotkey-ctrl') as HTMLInputElement).checked;
    const alt = (view.querySelector('#sherri-hotkey-alt') as HTMLInputElement).checked;
    const key = (view.querySelector('#sherri-hotkey-key') as HTMLSelectElement).value;
    const display = `${shift ? 'Shift+' : ''}${ctrl ? 'Ctrl+' : ''}${alt ? 'Alt+' : ''}${key}`;
    (view.querySelector('#sherri-hotkey-display') as HTMLElement).textContent = display;
  }

  ['#sherri-hotkey-shift', '#sherri-hotkey-ctrl', '#sherri-hotkey-alt', '#sherri-hotkey-key'].forEach(sel => {
    view.querySelector(sel)?.addEventListener('change', updateHotkeyDisplay);
  });

  // 测试预览按钮
  view.querySelector('#sherri-test-btn')?.addEventListener('click', async () => {
    const previewDiv = view.querySelector('#sherri-preview') as HTMLElement;
    previewDiv.innerHTML = '<p style="color: #666;">正在生成预览...</p>';

    try {
      const tempCfg = {
        roleOffsetX: parseInt((view.querySelector('#sherri-role-offset-x') as HTMLInputElement).value) || 0,
        roleOffsetY: parseInt((view.querySelector('#sherri-role-offset-y') as HTMLInputElement).value) || 0,
        textLeft: parseInt((view.querySelector('#sherri-text-left') as HTMLInputElement).value) || defaults.textLeft,
        textRight: parseInt((view.querySelector('#sherri-text-right') as HTMLInputElement).value) || defaults.textRight,
        textTop: parseInt((view.querySelector('#sherri-text-top') as HTMLInputElement).value),
        textBottom: parseInt((view.querySelector('#sherri-text-bottom') as HTMLInputElement).value) || defaults.textBottom,
        maxFontSize: parseInt((view.querySelector('#sherri-max-font') as HTMLInputElement).value) || defaults.maxFontSize,
        minFontSize: parseInt((view.querySelector('#sherri-min-font') as HTMLInputElement).value) || defaults.minFontSize,
      };

      const selectedIndex = parseInt((view.querySelector('#sherri-test-text') as HTMLSelectElement).value);
      const testText = testTexts[selectedIndex].value;

      const canvas = await generateImageWithConfig(testText, tempCfg);
      const dataUrl = canvas.toDataURL('image/png');
      previewDiv.innerHTML = `<img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">`;
    } catch (err) {
      previewDiv.innerHTML = `<p style="color: red;">预览失败: ${(err as Error).message}</p>`;
    }
  });
};
