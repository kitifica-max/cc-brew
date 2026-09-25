import { supabase } from './db.js'
import { fetchInterestOverTime, classifyDemand } from './trends.js'

export const TOOL_DEFINITIONS = [
  {
    name: 'create_session',
    description: 'Inicia una sesión de evaluación CC Brew. Llama esto al principio del flujo /cc-brew.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Nombre corto de la idea a evaluar' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'save_idea',
    description: 'Guarda la idea libre del usuario en la sesión antes de generar el cuestionario.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        idea_text: { type: 'string', description: 'Idea libre tal como la describió el usuario' },
      },
      required: ['session_id', 'idea_text'],
    },
  },
  {
    name: 'save_questionnaire',
    description: 'Guarda el cuestionario generado. Array "questions" con campos id, text, type (single|multi), options.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        questionnaire: { type: 'object', description: '{ questions: [{id, text, type, options}] }' },
      },
      required: ['session_id', 'questionnaire'],
    },
  },
  {
    name: 'get_answers',
    description: 'Lee la idea original y las respuestas del cuestionario para evaluar.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
  {
    name: 'save_evaluation',
    description: 'Guarda la evaluación (14 criterios: 10 de producto + 4 de Business Check + decisión BUILD/RETHINK/DON\'T BUILD) y el brief generado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        decision: { type: 'string', enum: ['BUILD', 'RETHINK', 'DON\'T BUILD', 'NOT_ENOUGH_SIGNAL', 'VALIDATE_FIRST'] },
        criteria: {
          type: 'object',
          description: 'Objeto con señal (strong|moderate|weak|unknown) para cada uno de los 14 criterios (10 de producto + moat, gtm, unit_economics, usage_frequency)',
        },
        strongest_signal: { type: 'string' },
        biggest_risk: { type: 'string' },
        biggest_risk_category: { type: 'string', enum: ['tecnico', 'mercado', 'clonacion'], description: 'Clasificación de biggest_risk' },
        what_would_change: { type: 'string' },
        resource_estimate: {
          type: 'object',
          description: 'Estimado de horas de desarrollo V1 y notas de costo de infraestructura inicial',
          properties: {
            hours_low: { type: 'number' },
            hours_high: { type: 'number' },
            infra_notes: { type: 'string' },
          },
        },
        stack_recommendation: {
          type: 'object',
          description: 'Recomendación de stack no genérica',
          properties: {
            approach: { type: 'string' },
            reasoning: { type: 'string' },
          },
        },
        brief_md: { type: 'string', description: 'Brief de construcción en markdown. Solo si decision es BUILD.' },
      },
      required: ['session_id', 'decision', 'criteria'],
    },
  },
  {
    name: 'track_event',
    description: 'Registra un evento de uso para analytics internos.',
    inputSchema: {
      type: 'object',
      properties: {
        event: { type: 'string', enum: ['evaluation_complete', 'brief_generated', 'skill_started'] },
        metadata: { type: 'object', description: 'Datos opcionales adicionales' },
      },
      required: ['event'],
    },
  },
  {
    name: 'validate_demand',
    description: 'Consulta Google Trends para UN término de búsqueda: interés relativo (0-100) y tendencia (subiendo/bajando/estable) en los últimos 12 meses. Llamala una vez por cada término (3-5 por idea) antes de decidir — cero asunciones sobre demanda sin datos. Sin keyword difficulty (Trends no lo mide) — solo nivel de interés.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Término tal como lo escribiría un usuario real en Google' },
        geo: { type: 'string', description: 'Código de país ISO 3166-1 alpha-2 (ej. "US", "SV", "MX"). Vacío = mundial. Por defecto mundial.' },
      },
      required: ['keyword'],
    },
  },
]

// --- Implementaciones ---

async function create_session({ project_name }) {
  const session_id = 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const { error } = await supabase.from('cc_brew_sessions').insert({
    id: session_id,
    project_name,
    status: 'started',
  })
  if (error) throw new Error(error.message)
  return { content: [{ type: 'text', text: JSON.stringify({ session_id, project_name }) }] }
}

async function save_idea({ session_id, idea_text }) {
  const { error } = await supabase
    .from('cc_brew_sessions')
    .update({ idea_text, status: 'idea_saved' })
    .eq('id', session_id)
  if (error) throw new Error(error.message)
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function save_questionnaire({ session_id, questionnaire }) {
  if (!questionnaire?.questions?.length) throw new Error('questionnaire.questions required')
  const { error } = await supabase
    .from('cc_brew_sessions')
    .update({ questionnaire, status: 'questionnaire_ready' })
    .eq('id', session_id)
  if (error) throw new Error(error.message)
  return { content: [{ type: 'text', text: `Cuestionario guardado: ${questionnaire.questions.length} preguntas` }] }
}

async function get_answers({ session_id }) {
  const { data, error } = await supabase
    .from('cc_brew_sessions')
    .select('idea_text, questionnaire, answers, project_name')
    .eq('id', session_id)
    .single()
  if (error || !data) throw new Error('Session not found')
  if (!data.answers && !data.questionnaire) throw new Error('No answers submitted yet')
  return {
    content: [{
      type: 'text',
      text: `Proyecto: ${data.project_name}\n\nIdea:\n${data.idea_text}\n\nCuestionario:\n${JSON.stringify(data.questionnaire, null, 2)}\n\nRespuestas:\n${JSON.stringify(data.answers, null, 2)}`,
    }],
  }
}

async function save_evaluation({
  session_id, decision, criteria, strongest_signal, biggest_risk, biggest_risk_category,
  what_would_change, resource_estimate, stack_recommendation, brief_md,
}) {
  const { error } = await supabase
    .from('cc_brew_sessions')
    .update({
      status: 'evaluated',
      decision,
      evaluation: {
        criteria, strongest_signal, biggest_risk, biggest_risk_category,
        what_would_change, resource_estimate, stack_recommendation,
      },
      brief_md: brief_md ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session_id)
  if (error) throw new Error(error.message)

  // log analytics
  await supabase.from('cc_brew_events').insert({ event: 'evaluation_complete', metadata: { decision } })

  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, decision }) }] }
}

async function track_event({ event, metadata = {} }) {
  await supabase.from('cc_brew_events').insert({ event, metadata })
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function validate_demand({ keyword, geo }) {
  if (!keyword) throw new Error('keyword required')
  const data = await fetchInterestOverTime(keyword, geo ?? '')
  const verdict = classifyDemand(data)
  return { content: [{ type: 'text', text: JSON.stringify({ ...data, verdict }) }] }
}

const TOOLS = { create_session, save_idea, save_questionnaire, get_answers, save_evaluation, track_event, validate_demand }

// Handler JSON-RPC — sin auth
export async function mcpJsonRpcHandler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }) }
  }

  const { jsonrpc, id, method, params } = body

  // tools/list
  if (method === 'tools/list') {
    return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc, id, result: { tools: TOOL_DEFINITIONS } }) }
  }

  // initialize
  if (method === 'initialize') {
    return {
      statusCode: 200, headers, body: JSON.stringify({
        jsonrpc, id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cc-brew', version: '2.0.0' },
        },
      }),
    }
  }

  // tools/call
  if (method === 'tools/call') {
    const { name, arguments: args } = params ?? {}
    const fn = TOOLS[name]
    if (!fn) {
      return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc, id, error: { code: -32601, message: `Tool not found: ${name}` } }) }
    }
    try {
      const result = await fn(args ?? {})
      return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc, id, result }) }
    } catch (err) {
      return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc, id, error: { code: -32603, message: err.message } }) }
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc, id, error: { code: -32601, message: `Method not found: ${method}` } }) }
}
