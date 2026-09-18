import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED = new Set(['skill_download', 'mcp_copy', 'skill_copy', 'evaluation_complete'])

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS }
  }

  // GET — return copy counts for skill and mcp
  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('cc_brew_events')
      .select('event')
      .in('event', ['skill_copy', 'mcp_copy'])

    if (error) {
      console.error('track count error:', error.message)
      return { statusCode: 500, body: 'DB error' }
    }

    const counts = { skill_copy: 0, mcp_copy: 0 }
    for (const row of data ?? []) {
      if (counts[row.event] !== undefined) counts[row.event]++
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(counts)
    }
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
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}
