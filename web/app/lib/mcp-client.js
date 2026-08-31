import { pollEvaluateResult } from './projects-db'

const BASE = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? 'https://cc-brew-mcp.netlify.app'
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

// POST con reintento. `fetch` lanza TypeError ("Failed to fetch") en fallos de
// red/CORS — eso es lo que se reintenta y, si persiste, se convierte en un
// mensaje que el usuario puede entender en vez del texto crudo del browser.
async function postJSON(path, body, { retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
    } catch (e) {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 700)); continue }
      throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
    }
    if (!res.ok) {
      if (res.status >= 500 && attempt < retries) { await new Promise(r => setTimeout(r, 700)); continue }
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `Error ${res.status}`)
    }
    return res.json()
  }
}

// --- AI processing (paid route) ---

export async function generateQuestionnaire(ideaText, audienceProfile = null, brandProfile = null, mode = 'idea') {
  return postJSON('/api/ai/process', { step: 'questionnaire', idea_text: ideaText, audience_profile: audienceProfile, brand_profile: brandProfile, mode })
  // { questions: [...] }
}

// La generación real corre en background (puede tardar más que un request-
// response normal — ver pollEvaluateResult). Esta función dispara el job y
// no resuelve hasta tener el resultado, así que para quien la llama se
// sigue viendo como un solo await, igual que antes.
export async function evaluateIdea(projectId, ideaText, answers, followupAnswers = null, audienceProfile = null, brandProfile = null, mode = 'idea') {
  await postJSON('/api/ai/process', {
    step: 'evaluate',
    project_id: projectId,
    idea_text: ideaText,
    answers,
    followup_answers: followupAnswers,
    audience_profile: audienceProfile,
    brand_profile: brandProfile,
    mode,
  })
  return pollEvaluateResult(projectId)
  // { semaforo: {...}, claude_md: '...' }
}

// Afina la idea del usuario antes de generar el cuestionario. Puede devolver
// hasta 3 preguntas aclaratorias en vez del texto mejorado — en ese caso hay
// que volver a llamarla con clarifyingAnswers, que ya siempre devuelve texto.
export async function enhanceIdea(ideaText, mode = 'idea', clarifyingAnswers = null) {
  return postJSON('/api/ai/process', { step: 'enhance_idea', idea_text: ideaText, mode, clarifying_answers: clarifyingAnswers })
  // { enhanced_idea_text: '...' } o { clarifying_questions: [...] }
}

export async function simplifyQuestion(questionText, questionOptions) {
  return postJSON('/api/ai/process', { step: 'simplify', question_text: questionText, question_options: questionOptions })
}

export async function refineIdea(ideaText, blockingCriteria, previousAnswers = null) {
  return postJSON('/api/ai/process', {
    step: 'refine',
    idea_text: ideaText,
    blocking_criteria: blockingCriteria,
    previous_answers: previousAnswers,
  })
  // { followup_questions: [...] }
}

export async function autoAnswerQuestions(ideaText, questions) {
  return postJSON('/api/ai/process', { step: 'auto_answer', idea_text: ideaText, questions })
  // { answers: { [qId]: [indices] } }
}

export async function describeImages(ideaText, images) {
  return postJSON('/api/ai/process', { step: 'describe_images', idea_text: ideaText, images })
  // { visual_references: "..." }
}

export async function analyzeBrand(ideaText, { url, images, pdf, answers } = {}) {
  return postJSON('/api/ai/process', { step: 'analyze_brand', idea_text: ideaText, url, images, pdf, answers })
  // { brand_profile: "..." }
}

// --- "Trae tu API" — clave propia de Anthropic ---

export async function saveAnthropicKey(anthropicKey) {
  return postJSON('/api/account', { action: 'save_anthropic_key', anthropic_key: anthropicKey })
  // { ok: true }
}

export async function deleteAnthropicKey() {
  return postJSON('/api/account', { action: 'delete_anthropic_key' })
  // { ok: true }
}

// --- MCP setup helper ---

export function getMcpAddCommand(apiKey, mcpUrl = BASE) {
  return `claude mcp add cc-brew --transport http "${mcpUrl}/mcp" --header "Authorization: Bearer ${apiKey}" --scope user`
}
