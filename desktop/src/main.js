import { app, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import PtyManager from './pty.js';
import Bridge from './bridge.js';
import { createProject, switchProject, getActive, listProjects, deleteProject, saveProjectEnv } from './projects.js';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './bridge.js';
import { extname, basename, resolve, sep } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Production: ~/.config/cc-controller/.env (not bundled in DMG)
// Dev: desktop/.env (fallback, dotenv skips already-set vars)
dotenv.config({ path: path.join(process.env.HOME || homedir(), '.config', 'cc-controller', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const HOME = process.env.HOME || homedir();
const extraPaths = [`${HOME}/.npm-global/bin`, `${HOME}/.local/bin`, '/opt/homebrew/bin', '/usr/local/bin'].join(':');
process.env.PATH = `${extraPaths}:${process.env.PATH || ''}`;

let tray = null;
let pty = null;
let bridge = null;
let startTime = null;
let uptimeInterval = null;

function getUptime() {
  if (!startTime) return '--:--';
  const s = Math.floor((Date.now() - startTime) / 1000);
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function buildMenu(status) {
  const active = getActive();
  const items = [{ label: 'CC Controller', enabled: false }, { label: `Estado: ${status}`, enabled: false }];

  if (status === 'running') {
    items.push(...[
      { label: `Uptime: ${getUptime()}`, enabled: false },
      { label: active ? `Proyecto: ${active.name}` : `Sesion: ${process.env.SESSION_ID}`, enabled: false },
      active ? { label: active.path, enabled: false } : null,
      { type: 'separator' },
      { label: 'Abrir PWA', click: () => shell.openExternal(`https://${process.env.PWA_URL || 'localhost:3000'}`) },
      { type: 'separator' },
      { label: 'Detener', click: stopSession },
      { label: 'Reiniciar', click: () => { stopSession(); startSession(); } },
    ].filter(Boolean));
  } else {
    items.push({ type: 'separator' }, { label: 'Iniciar', click: startSession });
  }
  items.push({ type: 'separator' }, { label: 'Salir', click: () => app.quit() });
  return Menu.buildFromTemplate(items);
}

function setTrayMenu(status) {
  tray.setContextMenu(buildMenu(status));
  tray.setToolTip(`CC Controller — ${status}`);
}

function broadcastProjects() {
  bridge?.broadcastProjectState(listProjects(), getActive()?.id ?? null);
}

function startSession() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_ID, SESSION_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SESSION_ID || !SESSION_TOKEN) {
    console.error('Missing env vars. Copy .env.example to ~/.config/cc-controller/.env');
    return;
  }
  if (SESSION_TOKEN.length < 16) {
    console.error('SESSION_TOKEN inseguro — mínimo 16 caracteres');
    return;
  }

  const active = getActive();
  pty = new PtyManager();
  pty.spawn('claude', [], active?.path ?? HOME);

  bridge = new Bridge({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_SERVICE_KEY, sessionId: SESSION_ID, sessionToken: SESSION_TOKEN });

  bridge.onInput = (text, continueConv, model, effort) => pty.write(text, continueConv, model, effort);
  pty.onMessage = (role, text) => bridge?.broadcastMessage(role, text);

  bridge.onCreateProject = (id, name) => {
    try {
      const project = createProject(id, name);
      pty.spawn('claude', [], project.path);
      setTrayMenu('running');
      broadcastProjects();
    } catch (e) {
      bridge?.broadcastMessage('system', `Error creando proyecto: ${e.message}`);
    }
  };

  bridge.onSwitchProject = (id) => {
    try {
      const project = switchProject(id);
      pty.spawn('claude', [], project.path);
      setTrayMenu('running');
      broadcastProjects();
    } catch (e) {
      bridge?.broadcastMessage('system', `Error cambiando proyecto: ${e.message}`);
    }
  };

  bridge.onUploadFile = async (storageKey, filename, projectId) => {
    let downloaded = false;
    try {
      const projects = listProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const safeName = basename(filename);
      if (!safeName || safeName.startsWith('.')) throw new Error('Nombre de archivo inválido');
      const ext = extname(safeName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Extensión no permitida: ${ext}`);
      const buffer = await bridge.downloadFromStorage(storageKey);
      downloaded = true;
      if (buffer.length > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx 10MB)');
      const destPath = resolve(project.path, safeName);
      if (!destPath.startsWith(resolve(project.path) + sep)) throw new Error('Ruta inválida');
      writeFileSync(destPath, buffer);
      bridge?.broadcastMessage('system', `Archivo guardado: ${safeName}`);
    } catch (e) {
      bridge?.broadcastMessage('system', `Error subiendo archivo: ${e.message}`);
    } finally {
      if (downloaded) await bridge.deleteFromStorage(storageKey).catch(() => {});
    }
  };

  bridge.onGetProjectState = () => broadcastProjects();

  bridge.onDeleteProject = (id) => {
    deleteProject(id);
    broadcastProjects();
  };

  bridge.onSaveEnv = (projectId, envObject) => {
    try {
      if (!envObject || typeof envObject !== 'object' || Array.isArray(envObject)) return;
      saveProjectEnv(projectId, envObject);
      const project = listProjects().find(p => p.id === projectId);
      bridge?.broadcastMessage('system', `Secretos guardados en .env: ${project?.name ?? projectId}`);
    } catch (e) {
      bridge?.broadcastMessage('system', `Error guardando secretos: ${e.message}`);
    }
  };

  bridge.onOpenClaudeDesktop = (projectId) => {
    const project = listProjects().find(p => p.id === projectId);
    if (!project) return;
    exec(`open -a "Claude" "${project.path}"`);
  };

  bridge.connect();
  bridge.startHeartbeat();

  setTimeout(broadcastProjects, 1000);

  startTime = Date.now();
  setTrayMenu('running');
  uptimeInterval = setInterval(() => { if (pty?.running) setTrayMenu('running'); }, 30_000);
}

function stopSession() {
  clearInterval(uptimeInterval);
  pty?.kill();
  bridge?.disconnect();
  pty = null; bridge = null; startTime = null; uptimeInterval = null;
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
