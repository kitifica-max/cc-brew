import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const AUTH_STORAGE_KEY = 'cc-desktop-auth';

export function configDir() {
  return join(process.env.HOME || homedir(), '.config', 'cc-controller');
}

// Adaptador de storage para supabase-js: guarda la sesión (incluido el refresh
// token) en disco con permisos 0600 para que el desktop siga autenticado entre
// arranques sin conservar la contraseña.
export function createFileAuthStorage(dir = configDir()) {
  const file = join(dir, 'auth.json');

  const read = () => {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
  };
  const write = (data) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
  };

  return {
    getItem: (key) => read()[key] ?? null,
    setItem: (key, value) => { const d = read(); d[key] = value; write(d); },
    removeItem: (key) => { const d = read(); delete d[key]; write(d); },
  };
}

export function hasStoredSession(dir = configDir()) {
  const file = join(dir, 'auth.json');
  if (!existsSync(file)) return false;
  try {
    return Boolean(JSON.parse(readFileSync(file, 'utf8'))[AUTH_STORAGE_KEY]);
  } catch {
    return false;
  }
}
