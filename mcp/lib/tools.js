import { validateApiKey, validateSession, extractApiKey } from './auth.js'
import { getBrief, updateSessionFields } from './sessions.js'
import { broadcastEvent } from './realtime.js'

// Definiciones de tools para el método tools/list
export const TOOL_DEFINITIONS = [
  {
    name: 'read_brief',
    description: 'Lee el BRIEF.md del proyecto desde la sesión CCC. Llama esto primero al iniciar.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'ID de sesión de CCC' } },
      required: ['session_id'],
    },
  },
  {
    name: 'get_project_config',
    description: 'Retorna configuración estructurada: nombre, stack, plataforma.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
  {
    name: 'update_status',
    description: 'Reporta progreso del build a la PWA del usuario.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        phase: { type: 'string', enum: ['planning', 'scaffolding', 'building', 'styling', 'running'] },
        message: { type: 'string' },
      },
      required: ['session_id', 'phase', 'message'],
    },
  },
  {
    name: 'notify_preview',
    description: 'Notifica a la PWA que el dev server está corriendo.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        url: { type: 'string' },
        port: { type: 'number' },
      },
      required: ['session_id', 'url', 'port'],
    },
  },
  {
    name: 'complete_session',
    description: 'Marca el build como completado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['session_id', 'summary'],
    },
  },
]

// Implementaciones de cada tool
async function read_brief({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getBrief(session_id)
  if (!data?.brief_content) throw new Error('Brief not uploaded yet')
  return { content: [{ type: 'text', text: data.brief_content }] }
}

async function get_project_config({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getBrief(session_id)
  if (!data) throw new Error('Session data not found')
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ name: data.project_name, status: data.status }),
    }],
  }
}

async function update_status({ session_id, phase, message }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, { phase, status: 'building' })
  await broadcastEvent(session_id, 'status', { phase, message })
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function notify_preview({ session_id, url, port }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, { preview_url: url, phase: 'running' })
  await broadcastEvent(session_id, 'preview', { url, port })
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function complete_session({ session_id, summary }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, {
    status: 'done',
    summary,
    completed_at: new Date().toISOString(),
  })
  await broadcastEvent(session_id, 'complete', { summary })
  return { content: [{ type: 'text', text: 'ok' }] }
}

const TOOLS = { read_brief, get_project_config, update_status, notify_preview, complete_session }

// Handler JSON-RPC principal — exportado para Netlify Function
export async function mcpJsonRpcHandler(event) {
  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { method, params, id } = body

  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'cc-creator', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return ok(id, { tools: TOOL_DEFINITIONS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params
    const fn = TOOLS[name]
    if (!fn) return err(id, -32601, `Unknown tool: ${name}`)
    try {
      const result = await fn(args, userId)
      return ok(id, result)
    } catch (e) {
      return err(id, -32000, e.message)
    }
  }

  return err(id, -32601, `Unknown method: ${method}`)
}

function ok(id, result) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, result }),
  }
}

function err(id, code, message) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
  }
}
