import { supabase } from './db.js'

export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('uk_')) return null
  const { data } = await supabase
    .from('ccc_users')
    .select('id')
    .eq('api_key', apiKey)
    .single()
  return data?.id ?? null
}

// balance = créditos de prueba + comprados (lo que le queda si NO tiene
// "Trae tu API"). byoApiKeyEnc va sin desencriptar — quien la use decide
// cuándo desencriptarla, para no traer texto plano a memoria de más.
export async function validateApiKeyWithBalance(apiKey) {
  if (!apiKey || !apiKey.startsWith('uk_')) return null
  const { data } = await supabase
    .from('ccc_users')
    .select('supabase_user_id, minutes_balance, trial_credits, byo_api_active, anthropic_api_key_enc')
    .eq('api_key', apiKey)
    .single()
  if (!data) return null
  return {
    // supabase_user_id, no `id` — `id` es la PK propia de ccc_users, no la
    // de auth.users. ccc_projects.user_id tiene FK contra auth.users(id),
    // así que usar `id` acá rompe cualquier write que dependa de este valor
    // (el caso real: ai-process-evaluate-background.mjs upsert-eando con
    // este userId — descubierto en vivo, violaba la FK constraint).
    userId: data.supabase_user_id,
    balance: (data.trial_credits ?? 0) + (data.minutes_balance ?? 0),
    byoApiActive: !!data.byo_api_active,
    byoApiKeyEnc: data.anthropic_api_key_enc ?? null,
  }
}

export async function validateSession(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export function extractApiKey(headers) {
  const auth = headers['authorization'] ?? headers['Authorization'] ?? ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return headers['x-api-key'] ?? headers['X-Api-Key'] ?? ''
}
