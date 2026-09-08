import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED = new Set(['skill_download', 'mcp_copy', 'evaluation_complete'])

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } }
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, body: 'Bad JSON' } }

  const { event: evt, metadata = {} } = body
  if (!ALLOWED.has(evt)) return { statusCode: 400, body: 'Unknown event' }

  const { error } = await supabase
    .from('cc_brew_events')
    .insert({ event: evt, metadata })

  if (error) {
    console.error('track error:', error.message)
    return { statusCode: 500, body: 'DB error' }
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}
