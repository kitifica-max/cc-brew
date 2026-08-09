import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const CONFIGURED = Boolean(URL && ANON_KEY);

// createClient lanza si falta la URL, y eso tumba el prerender del build.
export const supabase = createClient(URL || 'https://unconfigured.supabase.co', ANON_KEY || 'unconfigured');

export const SESSION_ID = process.env.NEXT_PUBLIC_SESSION_ID ?? 'main';

const TOKEN_KEY = 'cc-session-token';

// El token de emparejamiento nunca se compila en el bundle: se introduce una vez
// en la PWA y vive solo en este dispositivo.
export function getSessionToken() {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}

export function setSessionToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function clearSessionToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}
