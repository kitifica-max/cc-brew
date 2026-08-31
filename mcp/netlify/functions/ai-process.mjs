import Anthropic from '@anthropic-ai/sdk'
import { validateApiKeyWithBalance, extractApiKey } from '../../lib/auth.js'
import { decryptSecret } from '../../lib/crypto.js'
import { modeLine, callModel, callModelWithImages, callModelJson, buildContextText } from '../../lib/ai-shared.js'

const defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cliente de Anthropic activo para el request en curso — por default el de
// Kitifica; si el usuario tiene "Trae tu API", el handler lo cambia por uno
// armado con SU clave (desencriptada solo en memoria) antes de procesar.
// Seguro en este modelo de ejecución: Netlify Functions no interlean
// requests concurrentes dentro de la misma invocación de contenedor.
let activeClient = defaultClient

// Invocación server-to-server de la background function que hace la
// generación pesada de "evaluate" (ver ai-process-evaluate-background.mjs —
// ahí está el porqué). Esta llamada nunca la hace el browser, así que CORS
// no aplica; el secreto interno es lo que evita que cualquiera con la URL
// dispare generaciones gratis contra proyectos ajenos.
const BACKGROUND_EVALUATE_URL = 'https://cc-brew-mcp.netlify.app/.netlify/functions/ai-process-evaluate-background'

const ENHANCE_PROMPT = (ideaText, mode, clarifyingQA) => `Eres un estratega de marketing y ventas senior que ayuda a preparar el input antes de construir con Claude Code.

${mode === 'problema'
  ? 'El usuario describe un PROBLEMA que quiere resolver, todavía no una idea de producto. Tu tarea es ayudarlo a diseñar una solución concreta y acotada a ese problema, lista para convertirse en el input de un CLAUDE.md.'
  : 'El usuario ya tiene una idea de producto. Tu tarea es afinarla: hacerla más específica, enfocada y accionable, sin cambiar su esencia, para que tenga todo lo necesario para convertirse en un CLAUDE.md sólido.'}

TEXTO DEL USUARIO:
${ideaText}
${clarifyingQA ? `\nRESPUESTAS A PREGUNTAS ACLARATORIAS:\n${clarifyingQA}\n` : ''}
Reglas:
- Si con lo que tenés hay suficiente información para reescribir ${mode === 'problema' ? 'la solución' : 'la idea'} de forma clara, específica y accionable, hacelo directamente. Devolvé el texto reescrito en 2-4 frases, en español, en primera persona (como si el usuario mismo lo hubiera escrito así de claro).
- Si falta información crítica (a quién sirve, qué la hace distinta, alcance aproximado) y NO se puede inferir razonablemente, generá HASTA 3 preguntas cortas de opción múltiple para completarla. Nunca más de 3. Nunca si ya hay suficiente para avanzar.
${clarifyingQA ? '- Ya se respondieron preguntas aclaratorias: esta vez SIEMPRE devolvé el texto reescrito, nunca generes más preguntas.' : ''}

Responde SOLO con JSON válido, sin markdown, con UNA sola de estas dos formas:
{"enhanced_idea_text":"..."}
{"clarifying_questions":[{"id":"c1","text":"...","type":"single","options":["...","...","..."]}]}`

const QUESTIONNAIRE_PROMPT = (ideaText, contextText, mode) => `Eres un estratega de marketing y ventas senior que ayuda a estructurar herramientas que convencen a un cliente específico, antes de construirlas con Claude Code.

${modeLine(mode)}IDEA DEL USUARIO:
${ideaText}
${contextText ? `\n${contextText}\n` : ''}
Tu tarea: genera un cuestionario de 6-10 preguntas de opción múltiple. Las preguntas deben cubrir obligatoriamente estas 4 áreas (en este orden de prioridad):

1. RECORRIDO DEL CLIENTE: ¿Cómo va a ver/usar esta herramienta el cliente? ¿Cuál es el paso a paso desde que la abre hasta que decide?
2. ALCANCE v1 (scope enforcement): ¿Qué entra exactamente en la primera versión de la herramienta? ¿Qué se deja para después? Fuerza al usuario a recortar si la idea es grande.
3. RESTRICCIONES: Plataforma (web/móvil/desktop), stack preferido, qué ya existe o se reutiliza, integraciones externas necesarias.
4. REACCIÓN ESPERADA: ¿Qué decisión o acción concreta tiene que tomar el cliente al terminar de verla? (pedir cotización, agendar llamada, decir que sí en la reunión)

Además cubre si no está claro en la idea o el contexto:
- La objeción específica que la herramienta tiene que resolver
- Dependencias externas críticas (pagos reales, auth social, SMS, APIs de terceros)

Reglas:
- Las respuestas son chips/botones, no texto libre
- Cada pregunta tiene 3-4 opciones específicas y accionables
- Las opciones de alcance deben incluir siempre una opción conservadora ("Solo el núcleo", "Sin X por ahora")
- Idioma: español
- NO preguntes cosas que ya están claras en la idea, el perfil de público objetivo, o los lineamientos de marca

Responde SOLO con JSON válido, sin markdown ni comentarios:
{"questions":[{"id":"q1","text":"...","type":"single","options":["...","...","..."]}]}`

const REFINE_PROMPT = (ideaText, blockingCriteria, previousAnswersJson) => `Eres un estratega de marketing y ventas senior. El usuario describió una idea y respondió un cuestionario, pero ciertos criterios críticos siguen bloqueados.

IDEA:
${ideaText}

RESPUESTAS PREVIAS:
${previousAnswersJson}

CRITERIOS BLOQUEANTES (necesitan más información):
${blockingCriteria.map(c => `- ${c.key}: ${c.label} — ${c.msg}`).join('\n')}

Genera 2-3 preguntas de seguimiento MUY ESPECÍFICAS que resuelvan EXACTAMENTE estos criterios bloqueantes.
No preguntes lo que ya está respondido. Cada opción debe ser accionable y concreta. Chips de 3-4 opciones.

Responde SOLO con JSON válido, sin markdown:
{"followup_questions":[{"id":"r1","text":"...","type":"single","options":["...","...","..."]}]}`

const AUTO_ANSWER_PROMPT = (ideaText, questionsJson) => `Eres un estratega de marketing y ventas senior. Elige la mejor respuesta para cada una de estas preguntas del cuestionario, pensando en lo que más conviene para un v1 sólido y bien acotado de este proyecto.

IDEA DEL USUARIO:
${ideaText}

PREGUNTAS:
${questionsJson}

Reglas:
- Responde TODAS las preguntas recibidas, en el mismo orden, usando su "id" exacto.
- Para cada pregunta, elige el índice (0-based) de la mejor opción. Si el "type" es "multi", puedes elegir más de un índice.
- Si hay una opción conservadora/acotada entre las opciones y la idea no pide explícitamente algo más grande, prefiérela — el objetivo es un v1 realista, no el máximo alcance posible.
- Elige según el contexto real de la idea, no la primera opción por defecto.

Responde SOLO con JSON válido, sin markdown:
{"answers":{"<id_pregunta>":[indice1]}}`

const DESCRIBE_IMAGES_PROMPT = (ideaText, count) => `Eres un estratega de marketing y ventas senior. El usuario compartió ${count} imagen(es) como referencia visual para esta idea de producto.

IDEA:
${ideaText}

Para cada imagen, en el mismo orden en que aparecen, describí en 1-2 frases qué aporta como referencia de DISEÑO — estilo visual, layout, paleta de colores, patrones de interacción o componentes reutilizables como guía. No describas la imagen literalmente (evitá "se ve un botón azul arriba a la derecha"): interpretá qué intención de diseño comunica, en términos útiles para alguien construyendo v1 de este producto.

Responde en texto plano, sin markdown y sin JSON, un párrafo corto por imagen, en este formato exacto:
Imagen 1: [descripción como referencia de diseño]
Imagen 2: [descripción como referencia de diseño]`

const ANALYZE_BRAND_PROMPT = (ideaText, siteSignal, fallbackAnswersText, hasDocument, hasImages) => `Eres un estratega de marca senior. Tu tarea es consolidar en UN SOLO párrafo los lineamientos de marca de este usuario, a partir de las señales que te haya dado — puede que tengas varias a la vez, o solo una.

IDEA DEL PROYECTO (para dar contexto, no es lo que estás analizando):
${ideaText}
${hasDocument ? '\nEl usuario adjuntó un manual de marca (PDF) — leélo directo: paleta, tipografía, tono de voz, reglas de uso del logo.' : ''}
${hasImages ? '\nEl usuario adjuntó imágenes de referencia (capturas de su sitio, campañas, materiales de venta) — inferí estilo visual y tono a partir de ellas.' : ''}
${siteSignal ? `\nSEÑAL EXTRAÍDA DE SU SITIO WEB:\n${siteSignal}` : ''}
${fallbackAnswersText ? `\nRESPUESTAS DEL CUESTIONARIO DE RESPALDO (usalas solo para completar lo que el resto de las señales no cubra):\n${fallbackAnswersText}` : ''}

Consolidá todo en un solo párrafo de lineamientos de marca: tono de comunicación, paleta de colores (si hay señal de ella), tipografía (si aplica), y qué evitar. No inventes datos que ninguna señal respalde — si algo no se puede inferir, omitilo en vez de adivinar.

Responde en texto plano, sin markdown, un solo párrafo.`

// Extrae señal de marca de un sitio web sin necesitar un servicio de
// screenshots — título, meta description y una muestra del texto visible,
// para que el modelo infiera tono y estilo a partir de texto real.
async function fetchSiteSignal(url) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('URL de sitio inválida') }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('URL de sitio inválida')

  const res = await fetch(parsed.toString(), {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CCBrewBot/1.0)' },
  })
  if (!res.ok) throw new Error(`No se pudo cargar el sitio (HTTP ${res.status})`)
  const html = await res.text()

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? ''
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim()
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim() ?? ''
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ?? ''
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  return `Sitio: ${parsed.toString()}\nTítulo: ${title || '(sin título)'}\nDescripción: ${description || '(sin meta description)'}${themeColor ? `\nColor de tema declarado: ${themeColor}` : ''}\nTexto visible (muestra): ${bodyText || '(sin texto extraíble)'}`
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed', headers: corsHeaders() }
  }

  const apiKey = extractApiKey(event.headers)
  const auth = await validateApiKeyWithBalance(apiKey)
  if (!auth) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }), headers: corsHeaders() }
  }
  const { userId, balance, byoApiActive, byoApiKeyEnc } = auth

  // Si el usuario ya cargó su propia API key de Anthropic, se procesa con
  // ESA clave — incluso durante el trial gratis, antes de pagar "Trae tu
  // API". Así puede confirmar que todo funciona antes de comprar acceso
  // ilimitado. byo_api_active (pagado) es lo que decide más abajo si además
  // se salta el gate de créditos — con solo la clave cargada, el trial
  // sigue consumiendo sus 3 proyectos gratis normalmente, solo que
  // procesados con la clave del usuario en vez de la de Kitifica.
  if (byoApiKeyEnc) {
    try {
      activeClient = new Anthropic({ apiKey: decryptSecret(byoApiKeyEnc) })
    } catch (e) {
      console.error('No se pudo desencriptar la API key del usuario:', e.message)
      return { statusCode: 500, body: JSON.stringify({ error: 'Hubo un problema con tu API key guardada. Revísala en Ajustes.' }), headers: corsHeaders() }
    }
  } else {
    activeClient = defaultClient
  }

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }), headers: corsHeaders() }
  }

  const { step, idea_text, answers, followup_answers, audience_profile, brand_profile, mode } = body
  const contextText = buildContextText(audience_profile, brand_profile)

  if (!idea_text && step !== 'simplify' && step !== 'analyze_brand') {
    return { statusCode: 400, body: JSON.stringify({ error: 'idea_text required' }), headers: corsHeaders() }
  }

  try {
    if (step === 'simplify') {
      const { question_text, question_options } = body
      if (!question_text || !question_options?.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'question_text y question_options requeridos' }), headers: corsHeaders() }
      }
      const prompt = `Tienes una pregunta técnica de un cuestionario de producto. Reescríbela en español simple para alguien sin conocimientos técnicos ni de programación.

PREGUNTA ORIGINAL: ${question_text}
OPCIONES ORIGINALES: ${question_options.join(' | ')}

Reglas:
- Máximo 12 palabras en la pregunta
- Opciones en lenguaje cotidiano, sin jerga
- Mismo número de opciones
- Mantén el sentido original pero con palabras simples

Responde SOLO con JSON válido: {"text":"...","options":["...","...","..."]}`
      const parsed = await callModelJson(activeClient, prompt, 700)
      return json(parsed)
    }

    if (step === 'enhance_idea') {
      const { clarifying_answers } = body
      const qaText = clarifying_answers
        ? Object.entries(clarifying_answers).map(([q, a]) => `${q}: ${a}`).join('\n')
        : null
      const parsed = await callModelJson(activeClient, ENHANCE_PROMPT(idea_text, mode, qaText), 1200)
      return json(parsed)
    }

    if (step === 'questionnaire') {
      const parsed = await callModelJson(activeClient, QUESTIONNAIRE_PROMPT(idea_text, contextText, mode), 2500)
      return json(parsed)
    }

    if (step === 'evaluate') {
      // byoApiActive (plan pagado) = ilimitado, no importa el balance de
      // créditos. Sin pagar, el trial + los créditos comprados rigen igual
      // que siempre, tenga o no cargada su propia clave.
      if (!byoApiActive && balance <= 0) {
        return { statusCode: 402, body: JSON.stringify({ error: 'Sin créditos. Compra un plan en ccbrew.kitifica.com' }), headers: corsHeaders() }
      }
      const { project_id } = body
      if (!project_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'project_id required' }), headers: corsHeaders() }
      }

      // La generación (semaforo + CLAUDE.md completo, hasta 7000 tokens) se
      // dispara en una Background Function en vez de esperarla acá: Netlify
      // mata esta function a los ~30s y la generación real ronda ese límite
      // — logs de producción confirmaron "Status: timeout" reproducible.
      // Este fetch es server-to-server (no hay browser de por medio, no
      // aplica CORS) y devuelve apenas Netlify acepta la invocación.
      let bgRes
      try {
        bgRes = await fetch(BACKGROUND_EVALUATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': process.env.INTERNAL_FN_SECRET ?? '' },
          body: JSON.stringify({
            project_id, user_id: userId, idea_text, answers, followup_answers,
            audience_profile, brand_profile, mode, byo_api_key_enc: byoApiKeyEnc,
          }),
          // El 202 de una Background Function llega casi al toque — si esto
          // alguna vez cuelga, que falle rápido en vez de arrastrar a esta
          // function síncrona cerca de su propio límite de nuevo.
          signal: AbortSignal.timeout(8000),
        })
      } catch (e) {
        console.error('evaluate: no se pudo invocar la background function:', e)
        return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo iniciar la generación. Intenta de nuevo.' }), headers: corsHeaders() }
      }
      // Confirmado en vivo (2026-08-29): sin esta espera, la background
      // function NUNCA arrancaba cuando la disparaba esta function síncrona
      // (0 logs más allá del arranque, ni éxito ni error, aunque llamada
      // directo por curl sí completaba en ~25s) — el contenedor Lambda de
      // esta function se congela apenas retorna, y eso corta la invocación
      // recién despachada antes de que Netlify termine de confirmarla. Con
      // esta espera, la misma llamada vía esta function completa normal.
      await new Promise(r => setTimeout(r, 2000))
      if (!bgRes.ok) {
        console.error('evaluate: background function respondió', bgRes.status)
        return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo iniciar la generación. Intenta de nuevo.' }), headers: corsHeaders() }
      }
      return json({ status: 'processing', project_id })
    }

    if (step === 'refine') {
      const { blocking_criteria, previous_answers } = body
      if (!blocking_criteria?.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'blocking_criteria required' }), headers: corsHeaders() }
      }
      const prevJson = previous_answers ? JSON.stringify(previous_answers, null, 2) : 'Sin respuestas previas'
      const parsed = await callModelJson(activeClient, REFINE_PROMPT(idea_text, blocking_criteria, prevJson), 1500)
      return json(parsed)
    }

    if (step === 'auto_answer') {
      const { questions: qs } = body
      if (!qs?.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'questions required' }), headers: corsHeaders() }
      }
      const questionsJson = JSON.stringify(
        qs.map(q => ({ id: q.id, text: q.text, type: q.type, options: q.options })),
        null, 2
      )
      const parsed = await callModelJson(activeClient, AUTO_ANSWER_PROMPT(idea_text, questionsJson), 1200)
      return json(parsed)
    }

    if (step === 'describe_images') {
      const { images } = body
      if (!images?.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'images required' }), headers: corsHeaders() }
      }
      if (images.length > 3) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Máximo 3 imágenes' }), headers: corsHeaders() }
      }
      const text = await callModelWithImages(activeClient, images, DESCRIBE_IMAGES_PROMPT(idea_text, images.length), 800)
      return json({ visual_references: text.trim() })
    }

    if (step === 'analyze_brand') {
      const { url, images: brandImages, pdf, answers: fallbackAnswers } = body
      if (!url && !brandImages?.length && !pdf && !fallbackAnswers) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Necesito al menos una señal: url, images, pdf o answers' }), headers: corsHeaders() }
      }
      if (brandImages?.length > 3) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Máximo 3 imágenes' }), headers: corsHeaders() }
      }

      let siteSignal = null
      if (url) {
        try {
          siteSignal = await fetchSiteSignal(url)
        } catch (e) {
          console.error('analyze_brand: no se pudo leer el sitio:', e.message)
          siteSignal = `(No se pudo cargar ${url}: ${e.message}. Ignorá esta fuente y usá el resto de las señales disponibles.)`
        }
      }
      const fallbackAnswersText = fallbackAnswers ? JSON.stringify(fallbackAnswers, null, 2) : null

      const prompt = ANALYZE_BRAND_PROMPT(idea_text ?? '', siteSignal, fallbackAnswersText, !!pdf, !!brandImages?.length)
      const text = (brandImages?.length || pdf)
        ? await callModelWithImages(activeClient, brandImages ?? [], prompt, 700, pdf)
        : await callModel(activeClient, prompt, 700)
      return json({ brand_profile: text.trim() })
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'step must be enhance_idea, questionnaire, evaluate, refine, auto_answer, describe_images or analyze_brand' }), headers: corsHeaders() }
  } catch (e) {
    console.error('ai-process error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }), headers: corsHeaders() }
  }
}

function json(data) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(data),
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
