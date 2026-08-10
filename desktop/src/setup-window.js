import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { homedir } from 'os';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function needsSetup() {
  return !process.env.SESSION_TOKEN || !process.env.SESSION_ID;
}

export function openSetupWindow() {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 480,
      height: 560,
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

    ipcMain.removeHandler('setup:check-claude');
    ipcMain.removeHandler('setup:save');
    ipcMain.removeHandler('setup:close');

    ipcMain.handle('setup:check-claude', () => new Promise((res) => {
      exec('which claude', (err) => res(!err));
    }));

    ipcMain.handle('setup:save', () => {
      const token = randomBytes(32).toString('hex');
      const sessionId = randomBytes(6).toString('hex'); // 12-char unique ID
      const configDir = path.join(homedir(), '.config', 'cc-controller');
      mkdirSync(configDir, { recursive: true });
      const lines = [
        `SESSION_ID=${sessionId}`,
        `SESSION_TOKEN=${token}`,
        `PWA_URL=https://ccc.kitifica.com`,
      ];
      writeFileSync(path.join(configDir, '.env'), lines.join('\n') + '\n');
      Object.assign(process.env, { SESSION_ID: sessionId, SESSION_TOKEN: token, PWA_URL: 'https://ccc.kitifica.com' });
      return { token, sessionId, pairingCode: `${sessionId}:${token}` };
    });

    ipcMain.handle('setup:close', () => {
      win.close();
    });

    win.on('closed', resolve);
  });
}
