import { validateApiKey, extractApiKey } from '../../lib/auth.js'
import { createSession, uploadBrief, getSession, deleteSession, saveIdea, saveAnswers } from '../../lib/sessions.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors }

  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) }

  const { httpMethod, path, body: rawBody } = event
  const parts = path.replace(/^\/api\/sessions\/?/, '').split('/')
  const sessionId = parts[0] || null
  const sub = parts[1] || null  // 'brief' | 'idea' | 'answers'

  if (sessionId && !/^sess_[0-9a-f]{16}$/.test(sessionId)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid session_id format' }) }
  }

  try {
    if (httpMethod === 'POST' && !sessionId) {
      const { project_name } = JSON.parse(rawBody ?? '{}')
      if (!project_name) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'project_name required' }) }
      const session_id = await createSession(userId, project_name)
      return json({ session_id })
    }

    if (httpMethod === 'PUT' && sessionId && sub === 'brief') {
      const { content } = JSON.parse(rawBody ?? '{}')
      if (!content) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'content required' }) }
      await uploadBrief(sessionId, userId, content)
      return json({ ok: true })
    }

    if (httpMethod === 'PUT' && sessionId && sub === 'idea') {
      const { idea_text } = JSON.parse(rawBody ?? '{}')
      if (!idea_text) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'idea_text required' }) }
      await saveIdea(sessionId, userId, idea_text)
      return json({ ok: true })
    }

    if (httpMethod === 'PUT' && sessionId && sub === 'answers') {
      const { answers } = JSON.parse(rawBody ?? '{}')
      if (!answers) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'answers required' }) }
      await saveAnswers(sessionId, userId, answers)
      return json({ ok: true })
    }

    if (httpMethod === 'GET' && sessionId) {
      const data = await getSession(sessionId, userId)
      if (!data) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Not found' }) }
      return json(data)
    }

    if (httpMethod === 'DELETE' && sessionId) {
      await deleteSession(sessionId, userId)
      return json({ ok: true })
    }

    return { statusCode: 404, headers: cors, body: 'Not found' }
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) }
  }
}

function json(data) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(data) }
}
