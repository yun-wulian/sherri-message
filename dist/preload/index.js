// Sherri Message - 预加载脚本
const { contextBridge, ipcRenderer } = require('electron');

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('sherri_message', {
  // 获取配置
  getConfig: () => ipcRenderer.invoke('LiteLoader.sherri_message.getConfig'),
  // 保存配置
  setConfig: (config) => ipcRenderer.invoke('LiteLoader.sherri_message.setConfig', config),
});
