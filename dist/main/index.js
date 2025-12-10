// Sherri Message - 主进程
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置文件路径
const dataPath = LiteLoader.plugins['sherri-message'].path.data;
const configPath = path.join(dataPath, 'config.json');
const tempDir = path.join(dataPath, 'temp');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
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

// 保存临时图片 (base64 -> file)
function saveTempImage(base64Data) {
  ensureDataDir();
  try {
    // 移除 data:image/png;base64, 前缀
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // 生成唯一文件名
    const fileName = `sherri_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (err) {
    console.error('[sherri-message] 保存临时图片失败:', err);
    return null;
  }
}

// 删除临时文件
function deleteTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error('[sherri-message] 删除临时文件失败:', err);
  }
  return false;
}

// 注册 IPC 事件
ipcMain.handle('LiteLoader.sherri_message.getConfig', () => {
  return getConfig();
});

ipcMain.handle('LiteLoader.sherri_message.setConfig', (event, config) => {
  return saveConfig(config);
});

ipcMain.handle('LiteLoader.sherri_message.saveTempImage', (event, base64Data) => {
  return saveTempImage(base64Data);
});

ipcMain.handle('LiteLoader.sherri_message.deleteTempFile', (event, filePath) => {
  return deleteTempFile(filePath);
});

// 导出 onBrowserWindowCreated (LiteLoader 要求)
module.exports.onBrowserWindowCreated = (window) => {
  // 窗口创建时可以做一些初始化
};
