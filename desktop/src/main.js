import { app, Tray, Menu, nativeImage, shell, clipboard, dialog, powerSaveBlocker, net, ipcMain } from 'electron';
import { needsSetup, openSetupWindow } from './setup-window.js';
import { createPanel, togglePanel, sendToPanel, isFirstOpen, markSeen } from './panel-window.js';
import { createMenuWindow, toggleMenuWindow, sendToMenu } from './menu-window.js';
import { openUpdaterWindow } from './updater-window.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { get as httpsGet } from 'https';
import dotenv from 'dotenv';
import PtyManager from './pty.js';
import Bridge from './bridge.js';
import { createProject, switchProject, getActive, listProjects, deleteProject, renameProject, saveProjectEnv, readProjectEnv, addExistingProject, readMcpConfig, saveMcpConfig, writeClaude, updateProjectPhase } from './projects.js';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './bridge.js';
import { getSupabaseConfig } from './supabase-config.js';
import { createFileAuthStorage, AUTH_STORAGE_KEY } from './auth-store.js';
import { extname, basename, resolve, sep } from 'path';
import { homedir } from 'os';
import { exec, spawn } from 'child_process';
import { createConnection as createTcpConn } from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Production: ~/.config/cc-controller/.env (not bundled in DMG)
// Dev: desktop/.env (fallback, dotenv skips already-set vars)
dotenv.config({ path: path.join(process.env.HOME || homedir(), '.config', 'cc-controller', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const HOME = process.env.HOME || homedir();
const extraPaths = [`${HOME}/.npm-global/bin`, `${HOME}/.local/bin`, '/opt/homebrew/bin', '/usr/local/bin'].join(':');
process.env.PATH = `${extraPaths}:${process.env.PATH || ''}`;

let tray    = null;
let panel   = null;
let menuWin = null;
let pty = null;
let bridge = null;
let startTime = null;
let uptimeInterval = null;
let powerBlockId = null;
let updateAvailable = null; // { version } | null
const BREW_UPDATE_CMD = 'brew upgrade --cask kitifica-max/tap/cc-controller';
const EXEC_WHITELIST = new Set(['npm','npx','node','git','yarn','pnpm','bun','ls','pwd','cat','mkdir','touch','echo','python3','pip3','cargo','go','make']);
let pendingFolderId = null; // set while PWA is waiting for user to pick a folder
let previewProc = null;

const DEV_PORTS = [3000, 3001, 4173, 5173, 5174, 8000, 8080, 8888, 4000, 4321, 6006];

function probePort(port) {
  return new Promise(resolve => {
    const sock = createTcpConn({ host: '127.0.0.1', port, timeout: 400 });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
  });
}

async function findDevPort() {
  for (const p of DEV_PORTS) {
    if (await probePort(p)) return p;
  }
  return null;
}

function checkForUpdates() {
  return new Promise((resolve) => {
    const pwaHost = (process.env.PWA_URL || 'ccc.kitifica.com').replace(/^https?:\/\//, '');
    const url = `https://${pwaHost}/api/latest`;
    httpsGet(url, { headers: { 'User-Agent': 'CC-Controller-App' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location, { headers: { 'User-Agent': 'CC-Controller-App' } }, (res2) => {
          let body = '';
          res2.on('data', (c) => { body += c; });
          res2.on('end', () => processBody(body, resolve));
        }).on('error', () => resolve(null));
        return;
      }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => processBody(body, resolve));
    }).on('error', () => resolve(null));
  });
}

function processBody(body, resolve) {
  try {
    const { version: latest } = JSON.parse(body);
    const current = app.getVersion();
    const isNewer = latest && latest.split('.').map(Number)
      .reduce((acc, n, i) => acc !== 0 ? acc : n - current.split('.').map(Number)[i], 0) > 0;
    if (isNewer) {
      updateAvailable = { version: latest };
      if (tray) setTrayMenu(bridge !== null ? 'running' : 'stopped');
      bridge?.sendPush('CC Creator', `Nueva versión v${latest} disponible — abre el menú del tray para actualizar`).catch(() => {});
    }
  } catch (_) {}
  resolve(updateAvailable);
}

function openBrewUpdate() {
  openUpdaterWindow(() => app.quit());
}

function getUptime() {
  if (!startTime) return '--:--';
  const s = Math.floor((Date.now() - startTime) / 1000);
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function buildMenu(status) {
  const active = getActive();
  const items = [
    { label: 'CC Creator', enabled: false },
    { label: `Estado: ${status}`, enabled: false },
  ];

  if (status === 'running') {
    items.push(...[
      { label: `Uptime: ${getUptime()}`, enabled: false },
      { label: active ? `Proyecto: ${active.name}` : `Sesion: ${process.env.SESSION_ID}`, enabled: false },
      active ? { label: active.path, enabled: false } : null,
      { type: 'separator' },
      { label: 'Abrir PWA', click: () => { const h = (process.env.PWA_URL || 'localhost:3000').replace(/^https?:\/\//, ''); shell.openExternal(`https://${h}`); } },
      { label: '📁 Abrir carpeta existente', click: openFolderDialog },
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
      { label: '⬆ Actualizar con Homebrew →', click: openBrewUpdate }
    );
  }
  items.push(
    { type: 'separator' },
    {
      label: updateAvailable ? `Actualización disponible: v${updateAvailable.version}` : 'Buscar actualizaciones',
      click: async () => {
        if (updateAvailable) {
          openBrewUpdate();
        } else {
          const result = await checkForUpdates();
          if (result) {
            setTrayMenu(bridge !== null ? 'running' : 'stopped');
            dialog.showMessageBox({
              type: 'info',
              message: `Nueva versión disponible: v${result.version}`,
              detail: `Ejecuta en Terminal:\n\n${BREW_UPDATE_CMD}`,
              buttons: ['Actualizar ahora', 'Cerrar'],
              defaultId: 0,
            }).then(({ response }) => { if (response === 0) openBrewUpdate(); });
          } else {
            dialog.showMessageBox({ type: 'info', message: 'Ya tienes la última versión', detail: `v${app.getVersion()} está actualizado.` });
          }
        }
      },
    },
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
  tray.setToolTip(`CC Creator — ${status}`);
}

async function openFolderDialog() {
  const id = pendingFolderId ?? (Math.random().toString(36).slice(2) + Date.now().toString(36));
  pendingFolderId = null;

  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta del proyecto',
    message: 'Elige el directorio raíz del proyecto',
  });

  if (canceled || !filePaths.length) {
    bridge?.broadcastMessage('system', '⚠️ No se seleccionó ninguna carpeta.');
    return;
  }
  const folderPath = filePaths[0];
  const name = path.basename(folderPath);
  try {
    const project = addExistingProject(id, name, folderPath);
    writeClaude(project.path, project);
    pty.spawn('claude', [], project.path);
    setTrayMenu('running');
    broadcastProjects();
  } catch (e) {
    bridge?.broadcastMessage('system', `Error abriendo carpeta: ${e.message}`);
  }
}

function buildMenuState() {
  const active = getActive();
  const status = bridge !== null ? 'running' : 'stopped';
  return {
    status,
    project: active ? { name: active.name, path: active.path } : null,
    uptime: status === 'running' ? getUptime() : null,
    trialLabel: trialDaysLeft !== null
      ? (trialDaysLeft === 0 ? 'Prueba: vence hoy' : `Prueba: ${trialDaysLeft} día${trialDaysLeft === 1 ? '' : 's'} restante${trialDaysLeft === 1 ? '' : 's'}`)
      : null,
    updateAvailable: updateAvailable ? { version: updateAvailable.version } : null,
  };
}

function broadcastProjects() {
  const projects = listProjects();
  const project  = getActive() ?? null;
  bridge?.broadcastProjectState(projects, project?.id ?? null);
  sendToPanel(panel, 'panel:state', { project, projects, running: bridge !== null, firstOpen: isFirstOpen() });
  sendToMenu(menuWin, 'menu:state', buildMenuState());
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
  const restored = await bridge.restoreSession();
  if (!restored) {
    bridge = null;
    await dialog.showMessageBox({
      type: 'warning',
      message: 'Tu sesión de CC Creator expiró.',
      detail: 'Vuelve a iniciar sesión con el mismo correo que usas en la PWA.',
    });
    await openSetupWindow();
    return;
  }

  const active = getActive();
  pty = new PtyManager();
  pty.spawn('claude', [], active?.path ?? HOME);

  bridge.onInput = (text, continueConv, model, effort, skipPermissions) => {
    const projectId = getActive()?.id ?? null;
    bridge._addToHistory({ role: 'user', text: text.trim(), projectId });
    pty.write(text, continueConv, model, effort, projectId, skipPermissions);
  };
  pty.onMessage = (role, text, projectId) => bridge?.broadcastMessage(role, text, projectId);
  pty.onChunk = (msgId, text, done, _projectId) => {
    bridge?.broadcastChunk(msgId, text, done, null); // null → PWA usa currentIdRef
    sendToPanel(panel, 'panel:chunk', { text, done });
    if (done) bridge?.sendPush('CC Creator', 'Claude terminó — toca para ver la respuesta').catch(() => {});
  };
  pty.onPermissionRequest = (text, msgId, projectId) => {
    bridge?.broadcastPermission(text, msgId, projectId ?? getActive()?.id ?? null);
  };
  pty.onUsage = (cost, inputTokens, projectId) => {
    bridge?.broadcastUsage(cost, inputTokens, projectId ?? getActive()?.id ?? null);
  };

  bridge.onCreateProject = (id, name) => {
    try {
      const project = createProject(id, name);
      if (project.path) writeClaude(project.path, project);
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

  bridge.onExecCommand = (cmd, projectId) => {
    const parts = (cmd ?? '').trim().split(/\s+/).filter(Boolean);
    const bin = parts[0];
    if (!bin || !EXEC_WHITELIST.has(bin)) {
      bridge?.broadcastExecOutput(`⛔ No permitido: "${bin}". Comandos válidos: ${[...EXEC_WHITELIST].join(', ')}`, true, 1);
      return;
    }
    const project = (projectId ? listProjects().find(p => p.id === projectId) : null) ?? getActive();
    if (!project?.path) { bridge?.broadcastExecOutput('⛔ Sin proyecto activo.', true, 1); return; }

    const proc = spawn(bin, parts.slice(1), { cwd: project.path, env: { ...process.env } });
    let killed = false;
    let previewTriggered = false;
    const timer = setTimeout(() => { killed = true; proc.kill(); }, 30_000);
    const PORT_RE = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})/i;

    const onData = (d) => {
      const text = d.toString();
      bridge?.broadcastExecOutput(text, false);
      if (!previewTriggered) {
        const match = text.match(PORT_RE);
        if (match) {
          const port = parseInt(match[1], 10);
          if (port >= 1000 && port <= 65535) {
            previewTriggered = true;
            clearTimeout(timer); // dev server: no timeout
            bridge?.onOpenPreview(port);
          }
        }
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('close', code => {
      clearTimeout(timer);
      bridge?.broadcastExecOutput(killed ? '\n[Timeout 30s: proceso terminado]' : '', true, code ?? 0);
    });
    proc.on('error', e => { clearTimeout(timer); bridge?.broadcastExecOutput(`Error: ${e.message}`, true, 1); });
  };

  bridge.onGetProjectState = (pwaProjects) => {
    if (Array.isArray(pwaProjects)) {
      const stored = listProjects();
      pwaProjects.forEach(({ id, name }) => {
        const local = stored.find(p => p.id === id);
        if (local && name && local.name !== name) renameProject(id, name);
      });
    }
    broadcastProjects();
  };

  bridge.onGetMcpConfig = (projectId) => {
    try {
      const mcpServers = readMcpConfig(projectId);
      bridge.broadcastMcpConfig(projectId, mcpServers);
    } catch (e) {
      bridge?.broadcastMessage('system', `Error leyendo MCP config: ${e.message}`);
    }
  };

  bridge.onSaveMcpConfig = (projectId, mcpServers) => {
    try {
      if (!mcpServers || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) return;
      saveMcpConfig(projectId, mcpServers);
      bridge?.broadcastMessage('system', 'MCP servers actualizados.');
    } catch (e) {
      bridge?.broadcastMessage('system', `Error guardando MCP config: ${e.message}`);
    }
  };

  bridge.onRenameProject = (id, name) => {
    renameProject(id, name);
    broadcastProjects();
  };

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

  bridge.onOpenPreview = async (port) => {
    if (previewProc) { previewProc.kill(); previewProc = null; }
    let actualPort = port;
    if (!actualPort) {
      actualPort = await findDevPort();
      if (!actualPort) { bridge?.broadcastPreviewUrl(null, 0); return; }
    }
    const proc = spawn('cloudflared', ['tunnel', '--url', `localhost:${actualPort}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    previewProc = proc;
    const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    const onData = (data) => {
      const match = data.toString().match(URL_RE);
      if (match) {
        bridge?.broadcastPreviewUrl(match[0], actualPort);
        proc.stdout.off('data', onData);
        proc.stderr.off('data', onData);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (e) => {
      bridge?.broadcastPreviewUrl(null, actualPort);
    });
    proc.on('close', () => { if (previewProc === proc) previewProc = null; });
  };

  bridge.onOpenFolder = (id) => {
    // dialog.showOpenDialog only works when triggered by a real user click that
    // gives Electron OS-level focus. Store the id and surface a tray menu item;
    // when the user clicks it the OS grants focus and the dialog appears.
    pendingFolderId = id;
    setTrayMenu(pty?.running ? 'running' : 'stopped');
  };

  bridge.onPhaseChange = (projectId, phase) => {
    const updated = updateProjectPhase(projectId, phase);
    if (updated) bridge?.broadcastPhaseChange(projectId, phase);
  };

  bridge.onGetEnv = (projectId) => {
    try {
      const env = readProjectEnv(projectId);
      bridge.channel?.send({ type: 'broadcast', event: 'env-state', payload: { projectId, env, ts: Date.now() } });
    } catch (_) {}
  };

  bridge.onStarterMessage = (projectId) => {
    const project = listProjects().find(p => p.id === projectId);
    if (!project) return;
    const msg = `Eres el asistente de CC Creator para el proyecto "${project.name}". Por favor:\n1. Saluda al usuario y preséntate\n2. Explica el proceso de 6 fases de CC Creator y la filosofía Kitifica Local First\n3. Pregunta qué quiere construir\nNo empieces a codear todavía.`;
    bridge._addToHistory({ role: 'user', text: msg.trim(), projectId });
    pty?.write(msg, false, project.model ?? 'claude-sonnet-4-6', project.effort ?? 'medium', projectId, true);
    bridge.channel?.send({ type: 'broadcast', event: 'starter-sent', payload: { projectId, ts: Date.now() } });
  };

  bridge.onOpenClaudeDesktop = (projectId) => {
    const project = listProjects().find(p => p.id === projectId);
    if (!project) return;
    const path = project.path.replace(/"/g, '\\"');
    exec(`osascript -e 'tell application "Terminal" to do script "cd \\"${path}\\" && claude --continue"' -e 'tell application "Terminal" to activate'`);
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
  if (previewProc) { previewProc.kill(); previewProc = null; }
  pty = null; bridge = null; startTime = null; uptimeInterval = null;
  setTrayMenu('stopped');
}

async function signOutAndSetup() {
  if (bridge) await bridge.signOut().catch(() => {});
  createFileAuthStorage().removeItem(AUTH_STORAGE_KEY);
  stopSession();
  await openSetupWindow();
}

// ── Panel IPC handlers ────────────────────────────────────────────────────────
ipcMain.handle('panel:advance-phase', (_, projectId, phase) => {
  const updated = updateProjectPhase(projectId, phase);
  if (updated) bridge?.broadcastPhaseChange(projectId, phase);
  broadcastProjects();
});

ipcMain.handle('panel:open-terminal', (_, projectId) => {
  const project = listProjects().find(p => p.id === projectId);
  if (!project) return;
  const escapedPath = project.path.replace(/"/g, '\\"');
  exec(`osascript -e 'tell application "Terminal" to do script "cd \\"${escapedPath}\\" && claude --continue"' -e 'tell application "Terminal" to activate'`);
});

ipcMain.handle('panel:switch-project', (_, id) => {
  const project = switchProject(id);
  if (project && pty) pty.spawn('claude', [], project.path);
  broadcastProjects();
});

ipcMain.handle('panel:open-finder', (_, projectId) => {
  const project = listProjects().find(p => p.id === projectId);
  if (project?.path) shell.openPath(project.path);
});

ipcMain.handle('panel:open-menu', () => {
  if (!menuWin) return;
  sendToMenu(menuWin, 'menu:state', buildMenuState());
  toggleMenuWindow(menuWin, tray);
});

ipcMain.handle('panel:mark-seen', () => { markSeen(); });
ipcMain.handle('panel:close', () => { panel?.hide(); });

// ── Menu window IPC handlers ──────────────────────────────────────────────────
ipcMain.handle('menu:close',   () => menuWin?.hide());
ipcMain.handle('menu:quit',    () => app.quit());
ipcMain.handle('menu:start',   () => { startSession(); menuWin?.hide(); });
ipcMain.handle('menu:stop',    () => { stopSession();  menuWin?.hide(); });
ipcMain.handle('menu:restart', () => { stopSession(); startSession(); menuWin?.hide(); });
ipcMain.handle('menu:sign-out',() => { signOutAndSetup(); menuWin?.hide(); });
ipcMain.handle('menu:open-pwa', () => {
  const h = (process.env.PWA_URL || 'localhost:3000').replace(/^https?:\/\//, '');
  shell.openExternal(`https://${h}`);
  menuWin?.hide();
});
ipcMain.handle('menu:open-folder', async () => {
  menuWin?.hide();
  await openFolderDialog();
});
ipcMain.handle('menu:copy-token', () => {
  const token = process.env.SESSION_TOKEN;
  if (!token) {
    dialog.showMessageBox({ type: 'warning', message: 'SESSION_TOKEN no configurado en ~/.config/cc-controller/.env' });
    return;
  }
  clipboard.writeText(token);
  dialog.showMessageBox({ type: 'info', message: 'SESSION_TOKEN copiado al portapapeles.' });
  menuWin?.hide();
});
ipcMain.handle('menu:check-updates', async () => {
  menuWin?.hide();
  const result = await checkForUpdates();
  if (result) {
    openBrewUpdate();
  } else {
    dialog.showMessageBox({ type: 'info', message: 'Ya tienes la última versión', detail: `v${app.getVersion()} está actualizado.` });
  }
});
ipcMain.handle('menu:brew-update', () => { openBrewUpdate(); menuWin?.hide(); });

app.whenReady().then(async () => {
  app.dock?.hide();
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  panel = createPanel();
  menuWin = createMenuWindow();
  tray.on('click', () => {
    if (!panel) return;
    togglePanel(panel, tray);
    if (panel.isVisible()) broadcastProjects();
  });
  tray.on('right-click', () => {
    sendToMenu(menuWin, 'menu:state', buildMenuState());
    toggleMenuWindow(menuWin, tray);
  });
  setTrayMenu('stopped');

  if (needsSetup()) {
    await openSetupWindow();
  }

  // Check for updates 5s after launch, then every 4h
  setTimeout(checkForUpdates, 5_000);
  setInterval(checkForUpdates, 4 * 60 * 60 * 1_000);
});

app.on('window-all-closed', (e) => e.preventDefault());
