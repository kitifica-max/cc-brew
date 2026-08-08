import { app, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PtyManager from './pty.js';
import Bridge from './bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Electron empaquetado tiene PATH limitado — inyectar rutas donde suele vivir claude
const HOME = process.env.HOME || '';
const extraPaths = [
  `${HOME}/.npm-global/bin`,
  `${HOME}/.local/bin`,
  '/opt/homebrew/bin',
  '/usr/local/bin',
].join(':');
process.env.PATH = `${extraPaths}:${process.env.PATH || ''}`;

let tray = null;
let pty = null;
let bridge = null;
let startTime = null;
let uptimeInterval = null;

function getUptime() {
  if (!startTime) return '--:--';
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function buildMenu(status) {
  const items = [
    { label: 'CC Controller', enabled: false },
    { label: `Estado: ${status}`, enabled: false },
  ];

  if (status === 'running') {
    items.push(
      { label: `Uptime: ${getUptime()}`, enabled: false },
      { label: `Sesión: ${process.env.SESSION_ID}`, enabled: false },
      { type: 'separator' },
      { label: 'Abrir PWA', click: () => shell.openExternal(`https://${process.env.PWA_URL || 'localhost:3000'}`) },
      { type: 'separator' },
      { label: '■ Detener', click: stopSession },
      { label: '↺ Reiniciar', click: () => { stopSession(); startSession(); } },
    );
  } else {
    items.push(
      { type: 'separator' },
      { label: '▶ Iniciar', click: startSession },
    );
  }

  items.push(
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  );

  return Menu.buildFromTemplate(items);
}

function setTrayMenu(status) {
  tray.setContextMenu(buildMenu(status));
  tray.setToolTip(`CC Controller — ${status}`);
}

function startSession() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_ID, SESSION_TOKEN } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SESSION_ID || !SESSION_TOKEN) {
    console.error('Missing env vars. Check desktop/.env');
    return;
  }

  pty = new PtyManager();
  bridge = new Bridge({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_SERVICE_KEY,
    sessionId: SESSION_ID,
    sessionToken: SESSION_TOKEN,
  });

  bridge.onInput = (text) => pty.write(text);
  pty.onMessage = (role, text) => bridge?.broadcastMessage(role, text);

  bridge.connect();
  pty.spawn('claude', []);

  startTime = Date.now();
  setTrayMenu('running');

  uptimeInterval = setInterval(() => {
    if (pty?.running) setTrayMenu('running');
  }, 30_000);
}

function stopSession() {
  clearInterval(uptimeInterval);
  pty?.kill();
  bridge?.disconnect();
  pty = null;
  bridge = null;
  startTime = null;
  uptimeInterval = null;
  setTrayMenu('stopped');
}

app.whenReady().then(() => {
  app.dock?.hide();

  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  setTrayMenu('stopped');
});

app.on('window-all-closed', (e) => e.preventDefault());
