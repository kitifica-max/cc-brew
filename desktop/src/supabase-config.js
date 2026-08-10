// Bundled: usuarios no necesitan cuenta propia de Supabase.
// La anon key es pública por diseño; el acceso lo decide Realtime Authorization
// (ver scripts/setup-supabase.sql) contra el JWT del usuario que inicia sesión.
export const BUNDLED_SUPABASE_URL = 'https://qombceeynlvgkmoffcoa.supabase.co';
export const BUNDLED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvbWJjZWV5bmx2Z2ttb2ZmY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTM4MTgsImV4cCI6MjEwMTc2OTgxOH0.fksDXB7RD7vMIpdjLPdjH3uLfkJ_IlYqTvOc64FiptE';

export function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || BUNDLED_SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || BUNDLED_SUPABASE_ANON_KEY,
  };
}
