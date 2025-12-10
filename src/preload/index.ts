// Sherri Message - 预加载脚本
// 适配 QQ 9.9.18+ 版本，使用新版 IPC 通道
import { contextBridge, ipcRenderer } from 'electron';

// 获取 webContentId 的函数 (每次调用时获取最新值)
function getWebContentId(): number {
  const id = ipcRenderer.sendSync('LiteLoader.sherri_message.getWebContentId') as number;
  return id || 2;
}

// 初始化时获取一次并记录
const initialWebContentId = getWebContentId();
console.log('[sherri-message] Preload: webContentId =', initialWebContentId);

// 日志缓冲区 (用于发送到 renderer)
const preloadLogs: string[] = [];

function preloadLog(...args: unknown[]): void {
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

  const logEntry = `[${time}] [preload] ${message}`;
  preloadLogs.push(logEntry);
  console.log('[sherri-message]', ...args);
}

/**
 * 调用 QQ 底层函数 (新版 QQ IPC 方式，参考 lite-tools)
 * @param event IPC 事件配置
 * @param payload 请求负载
 * @param awaitCallback 是否等待回调，或指定回调 cmdName
 */
function nativeCall(
  event: { eventName: string; type?: string },
  payload: unknown,
  awaitCallback?: boolean | string | string[]
): Promise<unknown> {
  const callbackId = crypto.randomUUID();
  // 每次调用时获取最新的 webContentId (与 lite-tools 保持一致)
  const webContentId = getWebContentId();

  preloadLog('nativeCall 发送:', { callbackId, event, payload: (payload as { cmdName?: string })?.cmdName || payload, webContentId });

  let resolve: Promise<unknown>;

  if (awaitCallback) {
    resolve = new Promise((res) => {
      // 使用 (...args) 与 lite-tools 保持一致
      // args[0] = IpcRendererEvent
      // args[1] = header (包含 callbackId)
      // args[2] = data
      function onEvent(...args: unknown[]) {
        const header = args[1] as { callbackId?: string; cmdName?: string } | undefined;
        const data = args[2];

        preloadLog('收到 IPC 响应:', {
          headerCallbackId: header?.callbackId,
          expectedCallbackId: callbackId,
          match: header?.callbackId === callbackId,
          cmdName: header?.cmdName
        });

        if (typeof awaitCallback === 'boolean') {
          // 简单等待：匹配 callbackId
          if (header?.callbackId === callbackId) {
            preloadLog('回调匹配成功, 返回数据');
            ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
            res(data);
          }
        } else if (Array.isArray(awaitCallback)) {
          // 等待指定的多个 cmdName
          if (awaitCallback.includes(header?.cmdName || '')) {
            preloadLog('cmdName 匹配成功:', header?.cmdName);
            ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
            res(data);
          }
        } else {
          // 等待指定的单个 cmdName
          if (header?.cmdName === awaitCallback) {
            preloadLog('cmdName 匹配成功:', header?.cmdName);
            ipcRenderer.off(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
            res(data);
          }
        }
      }

      preloadLog('开始监听 IPC 通道:', `RM_IPCFROM_MAIN${webContentId}`);
      ipcRenderer.on(`RM_IPCFROM_MAIN${webContentId}`, onEvent);
    });
  } else {
    resolve = Promise.resolve(null);
  }

  preloadLog('发送到 IPC 通道:', `RM_IPCFROM_RENDERER${webContentId}`);
  // 与 lite-tools 保持一致的格式
  ipcRenderer.send(`RM_IPCFROM_RENDERER${webContentId}`, {
    peerId: webContentId,
    callbackId,
    ...event,
  }, payload);

  return resolve;
}

// 暴露 API 到渲染进程
const sherriAPI = {
  // 获取配置
  getConfig: () => ipcRenderer.invoke('LiteLoader.sherri_message.getConfig'),
  // 保存配置
  setConfig: (config: unknown) => ipcRenderer.invoke('LiteLoader.sherri_message.setConfig', config),
  // 保存临时图片
  saveTempImage: (base64Data: string) => ipcRenderer.invoke('LiteLoader.sherri_message.saveTempImage', base64Data),
  // 删除临时文件
  deleteTempFile: (filePath: string) => ipcRenderer.invoke('LiteLoader.sherri_message.deleteTempFile', filePath),
  // 获取文件信息 (MD5, 大小)
  getFileInfo: (filePath: string) => ipcRenderer.invoke('LiteLoader.sherri_message.getFileInfo', filePath) as Promise<{ md5: string; size: number } | null>,
  // 检查文件是否存在
  checkFileExists: (filePath: string) => ipcRenderer.invoke('LiteLoader.sherri_message.checkFileExists', filePath) as Promise<boolean>,
  // 获取 webContentId (每次调用返回最新值)
  getWebContentId: () => getWebContentId(),
  // QQ 底层调用 (新版 QQ IPC 方式)
  nativeCall,
  // 主进程日志
  log: (...args: unknown[]) => ipcRenderer.send('LiteLoader.sherri_message.log', ...args),
  // 获取 preload 日志
  getPreloadLogs: () => {
    const logs = [...preloadLogs];
    preloadLogs.length = 0;
    return logs;
  },
};

contextBridge.exposeInMainWorld('sherri_message', sherriAPI);

export type SherriAPI = typeof sherriAPI;
