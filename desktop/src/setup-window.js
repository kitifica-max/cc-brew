import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function needsSetup() {
  return !process.env.SESSION_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY;
}

export function openSetupWindow() {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 480,
      height: 660,
      resizable: false,
      minimizable: false,
      title: 'CC Controller — Configuración',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'setup-preload.js'),
      },
    });

    win.loadFile(path.join(__dirname, 'setup.html'));

    ipcMain.removeHandler('setup:save');
    ipcMain.removeHandler('setup:close');

    ipcMain.handle('setup:save', (_, { supabaseUrl, supabaseKey, pwaUrl }) => {
      const token = randomBytes(32).toString('hex');
      const configDir = path.join(homedir(), '.config', 'cc-controller');
      mkdirSync(configDir, { recursive: true });
      const lines = [
        `SUPABASE_URL=${supabaseUrl}`,
        `SUPABASE_SERVICE_KEY=${supabaseKey}`,
        `SESSION_ID=main`,
        `SESSION_TOKEN=${token}`,
      ];
      if (pwaUrl) lines.push(`PWA_URL=${pwaUrl}`);
      writeFileSync(path.join(configDir, '.env'), lines.join('\n') + '\n');
      Object.assign(process.env, {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_KEY: supabaseKey,
        SESSION_ID: 'main',
        SESSION_TOKEN: token,
      });
      if (pwaUrl) process.env.PWA_URL = pwaUrl;
      return { token };
    });

    ipcMain.handle('setup:close', () => {
      win.close();
    });

    win.on('closed', resolve);
  });
}
