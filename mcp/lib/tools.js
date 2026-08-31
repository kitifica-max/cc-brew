import { validateApiKey, validateSession, extractApiKey } from './auth.js'
import { createSession, getBrief, updateSessionFields, getIdea, saveIdea, saveQuestionnaire, getAnswers, saveEvaluation, saveBrandProfile, saveAudienceProfile, listAudienceProfiles } from './sessions.js'
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
    description: 'Retorna configuración básica de la sesión: nombre del proyecto y estado actual.',
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
  {
    name: 'create_session',
    description: 'Crea una nueva sesión CC Brew para sincronizar el flujo con la PWA. Úsalo al inicio del Skill.',
    inputSchema: {
      type: 'object',
      properties: { project_name: { type: 'string', description: 'Nombre corto de la herramienta a construir' } },
      required: ['project_name'],
    },
  },
  {
    name: 'save_idea',
    description: 'Guarda la idea libre del usuario en la sesión — qué herramienta quiere construir y a quién busca convencer.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        idea_text: { type: 'string', description: 'Idea libre del usuario tal como la describió' },
      },
      required: ['session_id', 'idea_text'],
    },
  },
  {
    name: 'get_idea',
    description: 'Lee la idea libre del usuario para generar el cuestionario. Llama esto primero en el flujo v2.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
  {
    name: 'get_audience_profiles',
    description: 'Lista los perfiles de público objetivo que el usuario ya guardó en proyectos anteriores, para ofrecer reutilizarlos en vez de volver a preguntar desde cero.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'save_audience_profile',
    description: 'Guarda el perfil de público objetivo de la sesión — a quién se busca convencer. Acepta el texto libre del usuario si ya tenía un perfil armado (raw_text), y/o los 6 campos estructurados si se construyó con el cuestionario. Si profile_id apunta a un perfil ya guardado, lo reutiliza sin crear uno nuevo; si save_to_library no es false, además lo guarda en la biblioteca del usuario para reutilizarlo en próximos proyectos.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        name: { type: 'string', description: 'Nombre corto para identificar este perfil en la biblioteca, ej. "Gerentes de operaciones pyme"' },
        role_level: { type: 'string', description: 'decisor | influenciador | filtro' },
        pain_point: { type: 'string', description: 'Dolor u objetivo específico de esta persona' },
        objection: { type: 'string', description: 'Objeción principal: precio, confianza, complejidad, urgencia, u otra' },
        success_signal: { type: 'string', description: 'Qué necesita ver o sentir para decir que sí' },
        buying_stage: { type: 'string', description: 'explorando | comparando | lista para decidir' },
        channel: { type: 'string', description: 'Dónde va a ver la herramienta: reunión en vivo, link por correo, redes, u otro' },
        raw_text: { type: 'string', description: 'Perfil de cliente en texto libre, si el usuario ya lo tenía armado en vez de responder el cuestionario' },
        profile_id: { type: 'string', description: 'ID de un perfil ya guardado en la biblioteca, si se está reutilizando uno existente' },
        save_to_library: { type: 'boolean', description: 'Default true. Poné false si no querés agregar este perfil a la biblioteca reutilizable.' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'save_brand_profile',
    description: 'Guarda el párrafo consolidado de lineamientos de marca de la sesión (tono, paleta, tipografía, reglas), reunido a partir de documento, imágenes, sitio web y/o cuestionario de respaldo.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        brand_profile: { type: 'string', description: 'Párrafo consolidado de lineamientos de marca' },
      },
      required: ['session_id', 'brand_profile'],
    },
  },
  {
    name: 'save_questionnaire',
    description: 'Guarda el cuestionario generado. El JSON debe tener un array "questions" con campos id, text, type (single|multi), options.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        questionnaire: {
          type: 'object',
          description: '{ questions: [{id, text, type, options}] }',
        },
      },
      required: ['session_id', 'questionnaire'],
    },
  },
  {
    name: 'get_answers',
    description: 'Lee la idea original y las respuestas del cuestionario para evaluar y generar el CLAUDE.md.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
  {
    name: 'save_evaluation',
    description: 'Guarda la evaluación del semáforo (claridad_objecion, alcance_v1, recorrido_cliente, dependencias_externas, coherencia, viabilidad) y el CLAUDE.md generado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        semaforo: {
          type: 'object',
          description: 'Objeto con scores 0-2 para cada criterio, mensajes, y followup_questions opcionales.',
        },
        claude_md: { type: 'string', description: 'Contenido completo del CLAUDE.md generado.' },
      },
      required: ['session_id', 'semaforo', 'claude_md'],
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

async function create_session({ project_name }, userId) {
  const session_id = await createSession(userId, project_name)
  return { content: [{ type: 'text', text: JSON.stringify({ session_id }) }] }
}

async function save_idea({ session_id, idea_text }, userId) {
  await saveIdea(session_id, userId, idea_text)
  return { content: [{ type: 'text', text: 'Idea guardada.' }] }
}

async function get_idea({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getIdea(session_id, userId)
  if (!data?.idea_text) throw new Error('No idea uploaded yet')
  return {
    content: [{
      type: 'text',
      text: `Proyecto: ${data.project_name}\n\nIdea del usuario:\n${data.idea_text}`,
    }],
  }
}

async function get_audience_profiles(_args, userId) {
  const profiles = await listAudienceProfiles(userId)
  if (!profiles.length) return { content: [{ type: 'text', text: 'Sin perfiles guardados todavía.' }] }
  return { content: [{ type: 'text', text: JSON.stringify(profiles, null, 2) }] }
}

async function save_audience_profile({ session_id, ...profile }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const profileId = await saveAudienceProfile(session_id, userId, profile)
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, profile_id: profileId }) }] }
}

async function save_brand_profile({ session_id, brand_profile }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await saveBrandProfile(session_id, userId, brand_profile)
  return { content: [{ type: 'text', text: 'Lineamientos de marca guardados.' }] }
}

async function save_questionnaire({ session_id, questionnaire }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  if (!questionnaire?.questions?.length) throw new Error('questionnaire.questions required')
  await saveQuestionnaire(session_id, userId, questionnaire)
  await broadcastEvent(session_id, 'questionnaire_ready', { count: questionnaire.questions.length })
  return { content: [{ type: 'text', text: `Cuestionario guardado: ${questionnaire.questions.length} preguntas` }] }
}

async function get_answers({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getAnswers(session_id, userId)
  if (!data?.answers) throw new Error('No answers submitted yet')
  return {
    content: [{
      type: 'text',
      text: `Idea original:\n${data.idea_text}\n\nPreguntas:\n${JSON.stringify(data.questionnaire, null, 2)}\n\nRespuestas:\n${JSON.stringify(data.answers, null, 2)}`,
    }],
  }
}

async function save_evaluation({ session_id, semaforo, claude_md }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  if (!semaforo || !claude_md) throw new Error('semaforo and claude_md required')
  await saveEvaluation(session_id, userId, semaforo, claude_md)
  await broadcastEvent(session_id, 'evaluation_ready', { semaforo })
  return { content: [{ type: 'text', text: 'CLAUDE.md guardado.' }] }
}

const TOOLS = { read_brief, get_project_config, update_status, notify_preview, complete_session, create_session, save_idea, get_idea, get_audience_profiles, save_audience_profile, save_brand_profile, save_questionnaire, get_answers, save_evaluation }

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
      serverInfo: { name: 'cc-brew', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return ok(id, { tools: TOOL_DEFINITIONS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params ?? {}
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
