// Sherri Message - 主进程
// 适配 QQ 9.9.18+ 版本
import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 类型声明
declare const LiteLoader: {
  plugins: {
    'sherri-message': {
      path: {
        data: string;
        plugin: string;
      };
    };
  };
};

// 配置文件路径
const dataPath = LiteLoader.plugins['sherri-message'].path.data;
const configPath = path.join(dataPath, 'config.json');
const tempDir = path.join(dataPath, 'temp');

// 确保数据目录存在
function ensureDataDir(): void {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

// 读取配置
function getConfig(): Record<string, unknown> {
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
function saveConfig(config: Record<string, unknown>): boolean {
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
function saveTempImage(base64Data: string): string | null {
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
function deleteTempFile(filePath: string): boolean {
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

// 获取文件信息 (MD5, 大小)
function getFileInfo(filePath: string): { md5: string; size: number } | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('[sherri-message] 文件不存在:', filePath);
      return null;
    }
    const buffer = fs.readFileSync(filePath);
    // 使用小写 MD5 (与 QQ 返回的格式一致)
    const md5 = crypto.createHash('md5').update(buffer).digest('hex').toLowerCase();
    const size = buffer.length;
    console.log('[sherri-message] 文件信息:', { path: filePath, md5, size });
    return { md5, size };
  } catch (err) {
    console.error('[sherri-message] 获取文件信息失败:', err);
    return null;
  }
}

// 检查文件是否存在
function checkFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// 注册 IPC 事件
ipcMain.handle('LiteLoader.sherri_message.getConfig', () => {
  return getConfig();
});

ipcMain.handle('LiteLoader.sherri_message.setConfig', (_event, config: Record<string, unknown>) => {
  return saveConfig(config);
});

ipcMain.handle('LiteLoader.sherri_message.saveTempImage', (_event, base64Data: string) => {
  return saveTempImage(base64Data);
});

ipcMain.handle('LiteLoader.sherri_message.deleteTempFile', (_event, filePath: string) => {
  return deleteTempFile(filePath);
});

ipcMain.handle('LiteLoader.sherri_message.getFileInfo', (_event, filePath: string) => {
  return getFileInfo(filePath);
});

ipcMain.handle('LiteLoader.sherri_message.checkFileExists', (_event, filePath: string) => {
  return checkFileExists(filePath);
});

// 日志输出
ipcMain.on('LiteLoader.sherri_message.log', (_event, ...args: unknown[]) => {
  console.log('[sherri-message]', ...args);
});

// 提供 webContentId 给 preload (全局注册，使用 event.sender.id)
ipcMain.on('LiteLoader.sherri_message.getWebContentId', (event) => {
  console.log('[sherri-message] getWebContentId called, sender.id:', event.sender.id);
  event.returnValue = event.sender.id;
});

// 导出 onBrowserWindowCreated (LiteLoader 要求)
export const onBrowserWindowCreated = (window: BrowserWindow): void => {
  console.log('[sherri-message] onBrowserWindowCreated called, webContentsId:', window.webContents.id);
};