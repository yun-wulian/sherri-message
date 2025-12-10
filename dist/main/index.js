// Sherri Message - 主进程
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const dataPath = LiteLoader.plugins['sherri-message'].path.data;
const configPath = path.join(dataPath, 'config.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
}

// 读取配置
function getConfig() {
  ensureDataDir();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[sherri-message] 读取配置失败:', err);
  }
  return {};
}

// 保存配置
function saveConfig(config) {
  ensureDataDir();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[sherri-message] 保存配置失败:', err);
    return false;
  }
}

// 注册 IPC 事件
ipcMain.handle('LiteLoader.sherri_message.getConfig', () => {
  return getConfig();
});

ipcMain.handle('LiteLoader.sherri_message.setConfig', (event, config) => {
  return saveConfig(config);
});

// 导出 onBrowserWindowCreated (LiteLoader 要求)
module.exports.onBrowserWindowCreated = (window) => {
  // 窗口创建时可以做一些初始化
};
