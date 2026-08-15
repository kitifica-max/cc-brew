import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BREW_CMD = 'brew';
const BREW_ARGS = ['upgrade', '--cask', 'kitifica-max/tap/cc-controller'];

// e.g. "28.9MB/ 97.5MB" → 29.6%
function parsePct(line) {
  const m = line.match(/([\d.]+)MB\s*\/\s*([\d.]+)MB/);
  if (!m) return null;
  return Math.min(99, Math.round((parseFloat(m[1]) / parseFloat(m[2])) * 100));
}

// "1.7.1 -> 1.7.3" from "kitifica-max/tap/cc-controller 1.7.1 -> 1.7.3"
function parseVersions(line) {
  const m = line.match(/cc-controller\s+([\d.]+)\s*-+>\s*([\d.]+)/i);
  return m ? { from: m[1], to: m[2] } : null;
}

function send(win, payload) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('updater:progress', payload);
}

export function openUpdaterWindow(appQuit) {
  const win = new BrowserWindow({
    width: 360,
    height: 180,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    vibrancy: 'hud',
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'updater-preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'updater.html'));
  win.once('ready-to-show', () => win.show());

  ipcMain.handleOnce('updater:close', () => win.destroy());

  let versions = null;
  let finished = false;

  const proc = spawn(BREW_CMD, BREW_ARGS, {
    env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' },
  });

  proc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      const v = parseVersions(line);
      if (v) { versions = v; }

      if (line.includes('Downloading')) {
        const pct = parsePct(line);
        if (pct !== null) {
          send(win, { phase: 'progress', pct, text: `Descargando… ${pct}%`, ...versions });
        } else {
          send(win, { phase: 'indeterminate', text: 'Descargando…', ...versions });
        }
      } else if (line.includes('Upgrading') || line.includes('Purging') || line.includes('Moving')) {
        send(win, { phase: 'progress', pct: 90, text: 'Instalando…', ...versions });
      } else if (line.includes('already installed') || line.includes('up-to-date')) {
        finished = true;
        send(win, { phase: 'already', ...versions });
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (!line || line.startsWith('==>')) return;
    send(win, { phase: 'indeterminate', text: line.slice(0, 80), ...versions });
  });

  proc.on('close', (code) => {
    if (finished) return;
    if (code === 0) {
      send(win, { phase: 'done', ...versions });
      setTimeout(() => appQuit(), 2000);
    } else {
      send(win, { phase: 'error', error: `brew salió con código ${code}.`, ...versions });
    }
  });

  proc.on('error', (err) => {
    send(win, { phase: 'error', error: `No se encontró brew: ${err.message}`, ...versions });
  });

  return win;
}
