const BASE = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? 'https://cc-creator-mcp.netlify.app'
const API_KEY_STORAGE = 'ccc_api_key'

export function getApiKey() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function setApiKey(key) {
  try { localStorage.setItem(API_KEY_STORAGE, key) } catch {}
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  }
}

export async function createSession(projectName) {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ project_name: projectName }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()  // { session_id }
}

export async function uploadBrief(sessionId, content) {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/brief`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('Failed to upload brief')
}

export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  return res.json()
}

export function getMcpAddCommand(apiKey, mcpUrl = BASE) {
  return `claude mcp add cc-creator --transport http --env CCC_API_KEY="${apiKey}" "${mcpUrl}/mcp"`
}
