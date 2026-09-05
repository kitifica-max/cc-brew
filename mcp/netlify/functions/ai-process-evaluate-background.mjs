import Anthropic from '@anthropic-ai/sdk'
import { decryptSecret } from '../../lib/crypto.js'
import { supabase } from '../../lib/db.js'
import { callModel, callModelJson, buildContextText, EVALUATION_PROMPT, BUILD_BRIEF_PROMPT } from '../../lib/ai-shared.js'

// Solo el step "evaluate" vive acá: es el único que genera contenido largo
// (CLAUDE_MD_PROMPT, hasta 7000 tokens) — los logs de producción mostraban
// "Status: timeout" a los 30000ms exactos cuando esto corría inline en la
// function síncrona. El sufijo "-background" en el nombre de archivo es lo
// que le dice a Netlify que la corra como Background Function (hasta 15min,
// responde 202 vacío de inmediato a quien la invoque).
//
// Nunca la llama el browser directo — la invoca ai-process.mjs server-to-server
// (por eso no hay CORS acá, y por eso el secreto interno abajo: es la única
// verificación de que el caller es nuestra propia function síncrona y no
// cualquiera que encuentre esta URL).
const defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const secret = event.headers['x-internal-secret'] ?? event.headers['X-Internal-Secret']
  if (!process.env.INTERNAL_FN_SECRET || secret !== process.env.INTERNAL_FN_SECRET) {
    console.error('ai-process-evaluate-background: secreto interno inválido, invocación rechazada')
    return { statusCode: 401 }
  }

  const {
    project_id, user_id, idea_text, answers, followup_answers,
    audience_profile, brand_profile, mode, byo_api_key_enc,
  } = JSON.parse(event.body ?? '{}')

  if (!project_id || !user_id) {
    console.error('ai-process-evaluate-background: project_id o user_id faltante')
    return { statusCode: 400 }
  }

  let client = defaultClient
  if (byo_api_key_enc) {
    try {
      client = new Anthropic({ apiKey: decryptSecret(byo_api_key_enc) })
    } catch (e) {
      // Si la key guardada del usuario no desencripta, mejor generar con la
      // de Kitifica que fallar del todo por un problema ajeno a este request.
      console.error('background: no se pudo desencriptar la API key del usuario, usando la default:', e.message)
    }
  }

  const contextText = buildContextText(audience_profile, brand_profile)
  const answersJson = answers ? JSON.stringify(answers, null, 2) : 'Sin respuestas'
  const followupJson = followup_answers ? JSON.stringify(followup_answers, null, 2) : null

  try {
    const [evaluation, briefText] = await Promise.all([
      callModelJson(client, EVALUATION_PROMPT(idea_text, contextText, answersJson, followupJson, mode), 2500),
      callModel(client, BUILD_BRIEF_PROMPT(idea_text, contextText, answersJson, followupJson, mode), 7000),
    ])
    // upsert, no update: si el debounce de sync del cliente todavía no
    // escribió la fila (carrera con patchProject), esto la crea. onConflict
    // hace que solo se toquen las columnas listadas acá — el resto de la
    // fila (idea_text, nodes, etc. si ya existía) queda intacto.
    const { error } = await supabase.from('ccc_projects').upsert({
      id: project_id,
      user_id,
      brief: briefText.trim(),
      decision: evaluation,
      // Legacy fields for backward compatibility
      claude_md: briefText.trim(),
      semaforo: evaluation,
      generation_error: null,
    }, { onConflict: 'id' })
    if (error) console.error('ai-process-evaluate-background: fallo guardando resultado:', error)
  } catch (e) {
    console.error('ai-process-evaluate-background error:', e)
    const { error } = await supabase.from('ccc_projects').upsert({
      id: project_id,
      user_id,
      generation_error: e.message || 'Hubo un problema generando tu CLAUDE.md. Intenta de nuevo.',
    }, { onConflict: 'id' })
    if (error) console.error('ai-process-evaluate-background: fallo guardando error:', error)
  }

  return { statusCode: 200 }
}
