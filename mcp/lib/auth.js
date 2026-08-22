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
