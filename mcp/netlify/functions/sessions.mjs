import { validateApiKey, extractApiKey } from '../../lib/auth.js'
import { createSession, uploadBrief, getSession, deleteSession } from '../../lib/sessions.js'

export async function handler(event) {
  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }

  const { httpMethod, path, body: rawBody } = event
  // path: /api/sessions o /api/sessions/sess_xxx o /api/sessions/sess_xxx/brief
  const parts = path.replace(/^\/api\/sessions\/?/, '').split('/')
  const sessionId = parts[0] || null
  const sub = parts[1] || null  // 'brief' o undefined

  try {
    // POST /api/sessions — crear sesión
    if (httpMethod === 'POST' && !sessionId) {
      const { project_name } = JSON.parse(rawBody ?? '{}')
      if (!project_name) return { statusCode: 400, body: JSON.stringify({ error: 'project_name required' }) }
      const session_id = await createSession(userId, project_name)
      return json({ session_id })
    }

    // PUT /api/sessions/:id/brief — subir brief
    if (httpMethod === 'PUT' && sessionId && sub === 'brief') {
      const { content } = JSON.parse(rawBody ?? '{}')
      if (!content) return { statusCode: 400, body: JSON.stringify({ error: 'content required' }) }
      await uploadBrief(sessionId, userId, content)
      return json({ ok: true })
    }

    // GET /api/sessions/:id — estado
    if (httpMethod === 'GET' && sessionId) {
      const data = await getSession(sessionId, userId)
      if (!data) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
      return json(data)
    }

    // DELETE /api/sessions/:id
    if (httpMethod === 'DELETE' && sessionId) {
      await deleteSession(sessionId, userId)
      return json({ ok: true })
    }

    return { statusCode: 404, body: 'Not found' }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}

function json(data) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
}
