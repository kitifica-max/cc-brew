import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = (u) => { try { new URL(u); return true; } catch { return false; } };
const safeUrl = rawUrl && isValidUrl(rawUrl) ? rawUrl : 'https://unconfigured.supabase.co';

export const CONFIGURED = Boolean(rawUrl && isValidUrl(rawUrl) && ANON_KEY);

export const supabase = createClient(safeUrl, ANON_KEY || 'unconfigured');

const SESSION_ID_KEY = 'cc-session-id';
const TOKEN_KEY = 'cc-session-token';

export function getSessionId() {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_SESSION_ID ?? 'main';
  return localStorage.getItem(SESSION_ID_KEY) || process.env.NEXT_PUBLIC_SESSION_ID || 'main';
}

export function setSessionId(id) {
  try { localStorage.setItem(SESSION_ID_KEY, id); } catch {}
}

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
