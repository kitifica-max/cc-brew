import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { homedir } from 'os';
import { exec } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config.js';
import { createFileAuthStorage, hasStoredSession, AUTH_STORAGE_KEY } from './auth-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function needsSetup() {
  return !process.env.SESSION_TOKEN || !process.env.SESSION_ID || !hasStoredSession();
}

// Misma cuenta que la PWA: el canal Realtime es privado y las políticas de
// `realtime.messages` se evalúan contra el JWT del usuario.
function authClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: createFileAuthStorage(),
      storageKey: AUTH_STORAGE_KEY,
    },
  });
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
    ipcMain.removeHandler('setup:sign-in');
    ipcMain.removeHandler('setup:save');
    ipcMain.removeHandler('setup:close');

    ipcMain.handle('setup:check-claude', () => new Promise((res) => {
      exec('which claude', (err) => res(!err));
    }));

    ipcMain.handle('setup:sign-in', async (_event, { email, password, mode }) => {
      const client = authClient();
      const creds = { email: String(email ?? '').trim(), password: String(password ?? '') };
      const { error } = mode === 'signup'
        ? await client.auth.signUp(creds)
        : await client.auth.signInWithPassword(creds);
      if (error) return { ok: false, error: error.message };
      const { data } = await client.auth.getSession();
      // signUp sin confirmar el correo no devuelve sesión.
      if (!data.session) return { ok: false, error: 'Confirma tu correo y vuelve a iniciar sesión' };
      return { ok: true };
    });

    ipcMain.handle('setup:save', () => {
      // Reconfigurar no debe romper un emparejamiento existente.
      const token = process.env.SESSION_TOKEN || randomBytes(32).toString('hex');
      const sessionId = process.env.SESSION_ID || randomBytes(6).toString('hex'); // 12-char unique ID
      const configDir = path.join(homedir(), '.config', 'cc-controller');
      mkdirSync(configDir, { recursive: true });
      const lines = [
        `SESSION_ID=${sessionId}`,
        `SESSION_TOKEN=${token}`,
        `PWA_URL=https://ccc.kitifica.com`,
      ];
      writeFileSync(path.join(configDir, '.env'), lines.join('\n') + '\n', { mode: 0o600 });
      Object.assign(process.env, { SESSION_ID: sessionId, SESSION_TOKEN: token, PWA_URL: 'https://ccc.kitifica.com' });
      return { token, sessionId, pairingCode: `${sessionId}:${token}` };
    });

    ipcMain.handle('setup:close', () => {
      win.close();
    });

    win.on('closed', resolve);
  });
}
