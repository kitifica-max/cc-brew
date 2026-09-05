// Prompts y helpers de generación compartidos entre la function síncrona
// (ai-process.mjs, pasos rápidos) y la background function (solo "evaluate",
// el único paso lento — ver ai-process-evaluate-background.mjs).

// Modo del usuario: 'idea' (ya tiene un producto en mente, hay que clarificarlo)
// o 'problema' (partió de un problema, CC Brew ayuda a diseñar la solución).
// Vacío en modo 'idea' para no cambiar el comportamiento ya validado.
export function modeLine(mode) {
  return mode === 'problema'
    ? 'El usuario partió de un PROBLEMA a resolver, no de un producto ya definido — pensá esto como el diseño de la solución a ese problema, no como refinar una idea existente.\n\n'
    : ''
}

// --- NUEVO FRAMEWORK: 10 criterios + decisión BUILD/RETHINK/DON'T BUILD ---

export const EVALUATION_PROMPT = (ideaText, contextText, answersJson, followupAnswersJson, mode) => `Eres un evaluador de productos brutally honesto. Tu trabajo es decirle a alguien si su idea vale la pena construirla — no motivarlo, no ser amable, ser útil.

${modeLine(mode)}IDEA DEL USUARIO:
${ideaText}
${contextText ? `\n${contextText}\n` : ''}
RESPUESTAS AL CUESTIONARIO:
${answersJson}
${followupAnswersJson ? `\nRESPUESTAS DE SEGUIMIENTO:\n${followupAnswersJson}` : ''}

EVALÚA ESTOS 10 CRITERIOS. Para cada uno, asigná una señal: "strong", "moderate", "weak", o "unknown".

1. problem_clarity: ¿El problema está claramente definido? ¿Se sabe qué dolor resuelve y para quién?
2. target_audience: ¿El público objetivo está definido con precisión? ¿No es "todos"?
3. value_proposition: ¿La propuesta de valor es clara y diferenciada? ¿Por qué esta y no otra?
4. competition: ¿Se conoce la competencia? ¿Hay diferenciación real?
5. feasibility: ¿Es técnicamente factible de construir? ¿Sin bloqueos técnicos críticos?
6. monetization: ¿Hay un modelo de monetación claro? ¿O al menos una hipótesis?
7. mvp_scope: ¿El alcance del MVP es acotado y realista? ¿O es un proyecto entero disfrazado de v1?
8. distribution: ¿Cómo llega al cliente? ¿Hay un canal definido?
9. timing: ¿Por qué ahora? ¿Hay algo que haga este momento especial?
10. founder_fit: ¿El fundador tiene las capacidades/contexto para construir esto?

Para cada criterio también generá un "reason" (1-2 frases explicando la señal).

Después, hacé un RED TEAM ANALYSIS:
- strongest_signal: La señal más positiva de toda la evaluación
- biggest_risk: El riesgo más grande que podría hacer fracasar esto
- what_would_change: Qué información adicional cambiaría la decisión

Finalmente, dale una DECISIÓN:
- "BUILD": Si hay suficiente señal positiva como para construir
- "RETHINK": Si hay potencial pero faltan señales críticas
- "DON_T_BUILD": Si las señales son demasiado débiles

Y explicá "why" (2-3 frases directas, sin rodeos).

Si hay followup_answers y la info es insuficiente, podés decir "NOT_ENOUGH_SIGNAL" o "VALIDATE_FIRST" como decisión — no fuerces una decisión cuando no hay datos.

Responde SOLO con JSON válido, sin markdown:
{
  "decision": "BUILD|RETHINK|DON_T_BUILD",
  "why": "...",
  "strongest_signal": "...",
  "biggest_risk": "...",
  "what_would_change": "...",
  "criteria": {
    "problem_clarity": {"signal": "strong|moderate|weak|unknown", "reason": "..."},
    "target_audience": {"signal": "...", "reason": "..."},
    "value_proposition": {"signal": "...", "reason": "..."},
    "competition": {"signal": "...", "reason": "..."},
    "feasibility": {"signal": "...", "reason": "..."},
    "monetization": {"signal": "...", "reason": "..."},
    "mvp_scope": {"signal": "...", "reason": "..."},
    "distribution": {"signal": "...", "reason": "..."},
    "timing": {"signal": "...", "reason": "..."},
    "founder_fit": {"signal": "...", "reason": "..."}
  },
  "before_you_build": "...",
  "v1_scope": "...",
  "dont_build_yet": "..."
}`

export const BUILD_BRIEF_PROMPT = (ideaText, contextText, answersJson, followupAnswersJson, mode) => `Eres un estratega de producto senior. Generá un BRIEF de construcción para esta idea que ya fue evaluada positivamente.

${modeLine(mode)}IDEA:
${ideaText}
${contextText ? `\n${contextText}\n` : ''}
RESPUESTAS:
${answersJson}
${followupAnswersJson ? `\nRESPUESTAS DE SEGUIMIENTO:\n${followupAnswersJson}` : ''}

Genera el documento con esta estructura (markdown puro):

# [Nombre descriptivo] — Brief de Construcción

## Para quién es
[1-2 frases sobre el usuario/cliente目标 y qué necesita]

## Qué resuelve
[El problema concreto que esta herramienta resuelve]

## Criterio de éxito
[Cómo sabemos que funcionó — no métricas técnicas, sino la señal del cliente]

## Alcance v1 — incluye
- [Feature 1]
- [Feature 2]

## Alcance v1 — excluye
- [Lo que se construye después]

## Stack recomendado
[Tech stack simple y concreto]

## Restricciones
- Plataforma: [web/móvil/desktop]
- Integraciones: [las necesarias]

## Primeros 3 pasos
1. [Acción concreta hoy]
2. [Construir la pieza mínima]
3. [Validar con alguien real]

## Referencias visuales
[Solo si la idea incluye imágenes]

---
*Generado por CC Brew · Evaluado como BUILD*`

export function buildContextText(audienceProfile, brandProfile) {
  const parts = []
  if (audienceProfile && Object.values(audienceProfile).some(Boolean)) {
    const p = audienceProfile
    parts.push(`PERFIL DE PÚBLICO OBJETIVO:
- Rol y nivel de decisión: ${p.role_level || 'no especificado'}
- Objetivo o dolor específico: ${p.pain_point || 'no especificado'}
- Objeción principal: ${p.objection || 'no especificada'}
- Qué necesita ver o sentir para decir que sí: ${p.success_signal || 'no especificado'}
- Etapa del proceso de compra: ${p.buying_stage || 'no especificada'}
- Canal de consumo: ${p.channel || 'no especificado'}`)
  }
  if (brandProfile) {
    parts.push(`LINEAMIENTOS DE MARCA:\n${brandProfile}`)
  }
  return parts.join('\n\n')
}

export function parseAiJson(text) {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  return JSON.parse(cleaned)
}

// CLAUDE_MD_PROMPT en particular genera un documento largo con varias
// secciones condicionales — a veces el modelo se pasa de maxTokens por pura
// variación de muestreo, no porque el prompt esté mal. Antes eso tiraba un
// error que obligaba a reintentar "Generar CLAUDE.md" a mano. Un reintento
// automático (transparente para el usuario) resuelve la enorme mayoría de
// esos casos sin que se note; si el reintento también se corta, ahí sí es
// una señal real de que hace falta más margen.
export async function callModel(client, prompt, maxTokens, _retried = false) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = msg.content.find(b => b.type === 'text')?.text
  if (!text) throw new Error('Sin respuesta de texto del modelo')
  if (msg.stop_reason === 'max_tokens') {
    if (!_retried) {
      console.error('callModel: respuesta cortada por max_tokens, reintentando una vez. Texto parcial:', text)
      return callModel(client, prompt, maxTokens, true)
    }
    console.error('callModel: respuesta cortada por max_tokens incluso tras reintentar. Texto parcial:', text)
    throw new Error('La respuesta se cortó por ser muy larga. Intenta de nuevo.')
  }
  return text
}

export async function callModelWithImages(client, images, promptText, maxTokens, pdf = null) {
  const content = [
    ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })),
    ...(pdf ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } }] : []),
    { type: 'text', text: promptText },
  ]
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
  })
  const text = msg.content.find(b => b.type === 'text')?.text
  if (!text) throw new Error('Sin respuesta de texto del modelo')
  if (msg.stop_reason === 'max_tokens') {
    console.error('callModelWithImages: respuesta cortada por max_tokens. Texto parcial:', text)
    throw new Error('La respuesta se cortó por ser muy larga. Intenta de nuevo.')
  }
  return text
}

export async function callModelJson(client, prompt, maxTokens) {
  const text = await callModel(client, prompt, maxTokens)
  try {
    return parseAiJson(text)
  } catch (e) {
    console.error('callModelJson: JSON inválido del modelo. Texto recibido:', text)
    throw new Error('Hubo un problema generando el contenido. Intenta de nuevo.')
  }
}
