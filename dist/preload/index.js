// Sherri Message - 预加载脚本
const { contextBridge, ipcRenderer } = require('electron');

// 获取 webContentsId (Euphony 风格)
let webContentsId;
try {
  const bootResult = ipcRenderer.sendSync('___!boot');
  webContentsId = bootResult?.webContentsId || 2;
} catch (e) {
  webContentsId = 2;
}

/**
 * 调用 QQ 底层函数 (来自 Euphony)
 */
function invokeNative(eventName, cmdName, registered, ...args) {
  return new Promise(resolve => {
    const callbackId = crypto.randomUUID();
    const callback = (event, ...args) => {
      if (args?.[0]?.callbackId == callbackId) {
        ipcRenderer.off(`IPC_DOWN_${webContentsId}`, callback);
        resolve(args[1]);
      }
    };
    ipcRenderer.on(`IPC_DOWN_${webContentsId}`, callback);
    ipcRenderer.send(`IPC_UP_${webContentsId}`, {
      type: 'request',
      callbackId,
      eventName: `${eventName}-${webContentsId}${registered ? '-register' : ''}`
    }, [cmdName, ...args]);
  });
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('sherri_message', {
  // 获取配置
  getConfig: () => ipcRenderer.invoke('LiteLoader.sherri_message.getConfig'),
  // 保存配置
  setConfig: (config) => ipcRenderer.invoke('LiteLoader.sherri_message.setConfig', config),
  // 保存临时图片
  saveTempImage: (base64Data) => ipcRenderer.invoke('LiteLoader.sherri_message.saveTempImage', base64Data),
  // 删除临时文件
  deleteTempFile: (filePath) => ipcRenderer.invoke('LiteLoader.sherri_message.deleteTempFile', filePath),
  // QQ 底层调用 (Euphony 风格)
  invokeNative,
});
