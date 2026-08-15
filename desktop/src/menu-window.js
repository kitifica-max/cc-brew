import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMenuWindow() {
  const win = new BrowserWindow({
    width: 268,
    height: 420,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    vibrancy: 'hud',
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'menu-preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'menu.html'));
  win.on('blur', () => win.hide());
  return win;
}

export function toggleMenuWindow(win, tray) {
  if (win.isVisible()) { win.hide(); return; }
  const tb = tray.getBounds();
  const wb = win.getBounds();
  const x = Math.round(tb.x + tb.width / 2 - wb.width / 2);
  win.setPosition(x, tb.y + tb.height + 4);
  win.show();
  win.focus();
}

export function sendToMenu(win, event, data) {
  if (win && !win.isDestroyed() && win.webContents)
    win.webContents.send(event, data);
}
