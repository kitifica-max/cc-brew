import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SESSION_ID = process.env.NEXT_PUBLIC_SESSION_ID ?? 'main';
export const SESSION_TOKEN = process.env.NEXT_PUBLIC_SESSION_TOKEN ?? '';
