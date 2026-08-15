import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync } from 'fs';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLAG_PATH = path.join(homedir(), '.config', 'cc-controller', 'panel-seen');

export function createPanel() {
  const win = new BrowserWindow({
    width: 320,
    height: 480,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    vibrancy: 'hud',
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'panel-preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'panel.html'));
  win.on('blur', () => win.hide());
  return win;
}

export function togglePanel(panel, tray) {
  if (panel.isVisible()) {
    panel.hide();
  } else {
    positionPanel(panel, tray);
    panel.show();
    panel.focus();
  }
}

export function positionPanel(panel, tray) {
  const tb = tray.getBounds();
  const wb = panel.getBounds();
  const x = Math.round(tb.x + tb.width / 2 - wb.width / 2);
  const y = tb.y + tb.height + 4;
  panel.setPosition(x, y);
}

export function sendToPanel(panel, event, data) {
  if (panel && !panel.isDestroyed() && panel.webContents) {
    panel.webContents.send(event, data);
  }
}

export function isFirstOpen() {
  return !existsSync(FLAG_PATH);
}

export function markSeen() {
  try { writeFileSync(FLAG_PATH, '', { flag: 'wx' }); } catch (_) {}
}
