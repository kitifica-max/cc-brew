import { app, Tray, Menu, nativeImage, shell, clipboard, dialog, powerSaveBlocker, net } from 'electron';
import { needsSetup, openSetupWindow } from './setup-window.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import PtyManager from './pty.js';
import Bridge from './bridge.js';
import { createProject, switchProject, getActive, listProjects, deleteProject, saveProjectEnv, addExistingProject } from './projects.js';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './bridge.js';
import { getSupabaseConfig } from './supabase-config.js';
import { createFileAuthStorage, AUTH_STORAGE_KEY } from './auth-store.js';
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
let powerBlockId = null;
let updateAvailable = null; // { version, url } | null

function checkForUpdates() {
  const req = net.request({
    method: 'GET',
    url: 'https://api.github.com/repos/kitifica-max/cc-controller/releases/latest',
    headers: { 'User-Agent': 'CC-Controller-App' },
  });
  req.on('response', (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try {
        const { tag_name, html_url } = JSON.parse(body);
        const latest = tag_name?.replace(/^v/, '');
        const current = app.getVersion();
        if (latest && latest !== current) {
          updateAvailable = { version: latest, url: html_url };
          if (tray) setTrayMenu(pty?.running ? 'running' : 'stopped');
        }
      } catch (_) {}
    });
  });
  req.on('error', () => {});
  req.end();
}

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
      { label: 'Cerrar sesión', click: signOutAndSetup },
    ].filter(Boolean));
  } else {
    items.push({ type: 'separator' }, { label: 'Iniciar', click: () => { startSession(); } });
  }
  if (updateAvailable) {
    items.push(
      { type: 'separator' },
      { label: `Nueva versión disponible: v${updateAvailable.version}`, enabled: false },
      { label: 'Descargar actualización →', click: () => shell.openExternal(updateAvailable.url) }
    );
  }
  items.push(
    { type: 'separator' },
    {
      label: 'Copiar SESSION_TOKEN',
      click: () => {
        const token = process.env.SESSION_TOKEN;
        if (!token) {
          dialog.showMessageBox({ type: 'warning', message: 'SESSION_TOKEN no configurado en ~/.config/cc-controller/.env' });
          return;
        }
        clipboard.writeText(token);
        dialog.showMessageBox({ type: 'info', message: 'SESSION_TOKEN copiado al portapapeles.\nPégalo en la PWA → Settings → Session Token.' });
      },
    },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  );
  return Menu.buildFromTemplate(items);
}

function setTrayMenu(status) {
  tray.setContextMenu(buildMenu(status));
  tray.setToolTip(`CC Controller — ${status}`);
}

function broadcastProjects() {
  bridge?.broadcastProjectState(listProjects(), getActive()?.id ?? null);
}

async function startSession() {
  const { SESSION_ID, SESSION_TOKEN } = process.env;
  if (!SESSION_ID || !SESSION_TOKEN) {
    console.error('Missing SESSION_ID or SESSION_TOKEN in ~/.config/cc-controller/.env');
    return;
  }
  if (SESSION_TOKEN.length < 16) {
    console.error('SESSION_TOKEN inseguro — mínimo 16 caracteres');
    return;
  }

  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  bridge = new Bridge({
    supabaseUrl,
    supabaseKey,
    sessionId: SESSION_ID,
    sessionToken: SESSION_TOKEN,
    authStorage: createFileAuthStorage(),
  });

  // El canal es privado: sin JWT válido Realtime rechaza la suscripción.
  if (!(await bridge.restoreSession())) {
    bridge = null;
    await dialog.showMessageBox({
      type: 'warning',
      message: 'Tu sesión de CC Controller expiró.',
      detail: 'Vuelve a iniciar sesión con el mismo correo que usas en la PWA.',
    });
    await openSetupWindow();
    return;
  }

  const active = getActive();
  pty = new PtyManager();
  pty.spawn('claude', [], active?.path ?? HOME);

  bridge.onInput = (text, continueConv, model, effort) => {
    const projectId = getActive()?.id ?? null;
    bridge._addToHistory({ role: 'user', text: text.trim(), projectId });
    pty.write(text, continueConv, model, effort, projectId);
  };
  pty.onMessage = (role, text, projectId) => bridge?.broadcastMessage(role, text, projectId);
  pty.onChunk = (msgId, text, done, projectId) => bridge?.broadcastChunk(msgId, text, done, projectId);

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
      const meta = await bridge.getFileMeta(storageKey);
      if (meta?.metadata?.size > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx 10MB)');
      const buffer = await bridge.downloadFromStorage(storageKey);
      downloaded = true;
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

  bridge.onOpenFolder = (id) => {
    // AppleScript choose folder is a native macOS dialog owned by osascript —
    // it appears in front regardless of Electron's window/focus state
    exec(
      `osascript -e 'POSIX path of (choose folder with prompt "Selecciona la carpeta raíz del proyecto:")'`,
      (err, stdout) => {
        const folderPath = stdout?.trim();
        if (err || !folderPath) {
          bridge?.broadcastMessage('system', '⚠️ No se seleccionó ninguna carpeta.');
          return;
        }
        const name = path.basename(folderPath);
        try {
          const project = addExistingProject(id, name, folderPath);
          pty.spawn('claude', [], project.path);
          setTrayMenu('running');
          broadcastProjects();
        } catch (e) {
          bridge?.broadcastMessage('system', `Error abriendo carpeta: ${e.message}`);
        }
      }
    );
  };

  bridge.onOpenClaudeDesktop = (projectId) => {
    const project = listProjects().find(p => p.id === projectId);
    if (!project) return;
    const path = project.path.replace(/"/g, '\\"');
    exec(`osascript -e 'tell application "Terminal" to do script "cd \\"${path}\\" && claude"' -e 'tell application "Terminal" to activate'`);
  };

  try {
    bridge.connect();
  } catch (e) {
    stopSession();
    dialog.showMessageBox({ type: 'error', message: 'No se pudo conectar', detail: e.message });
    return;
  }
  bridge.startHeartbeat();

  setTimeout(broadcastProjects, 1000);

  // Mantener pantalla y Mac despierta mientras la sesión corra
  if (powerBlockId === null) powerBlockId = powerSaveBlocker.start('prevent-display-sleep');

  startTime = Date.now();
  setTrayMenu('running');
  uptimeInterval = setInterval(() => { if (pty?.running) setTrayMenu('running'); }, 30_000);
}

function stopSession() {
  clearInterval(uptimeInterval);
  pty?.kill();
  bridge?.disconnect();
  if (powerBlockId !== null) { powerSaveBlocker.stop(powerBlockId); powerBlockId = null; }
  pty = null; bridge = null; startTime = null; uptimeInterval = null;
  setTrayMenu('stopped');
}

async function signOutAndSetup() {
  if (bridge) await bridge.signOut().catch(() => {});
  createFileAuthStorage().removeItem(AUTH_STORAGE_KEY);
  stopSession();
  await openSetupWindow();
}

app.whenReady().then(async () => {
  app.dock?.hide();
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  setTrayMenu('stopped');

  if (needsSetup()) {
    await openSetupWindow();
  }

  // Check for updates 5s after launch, then every 4h
  setTimeout(checkForUpdates, 5_000);
  setInterval(checkForUpdates, 4 * 60 * 60 * 1_000);
});

app.on('window-all-closed', (e) => e.preventDefault());
