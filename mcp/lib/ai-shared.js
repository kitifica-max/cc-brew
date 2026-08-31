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

export const SEMAFORO_PROMPT = (ideaText, contextText, answersJson, followupAnswersJson, mode) => `Eres un estratega de marketing y ventas senior evaluando si una herramienta está lista para construirse con Claude Code.

${modeLine(mode)}IDEA DEL USUARIO:
${ideaText}
${contextText ? `\n${contextText}\n` : ''}
RESPUESTAS AL CUESTIONARIO:
${answersJson}
${followupAnswersJson ? `\nRESPUESTAS DE SEGUIMIENTO:\n${followupAnswersJson}` : ''}

Evalúa estos 6 criterios. Score: 0=rojo (no cumple), 1=amarillo (parcial), 2=verde (cumple):

1. claridad_objecion: ¿Está clara la objeción o necesidad puntual del cliente que la herramienta tiene que resolver? No un dolor genérico — el de esta persona.
2. alcance_v1: ¿El alcance de la herramienta es concreto y acotado? ¿Hay cosas explícitamente excluidas?
3. recorrido_cliente: ¿Hay un recorrido definido de cómo el cliente ve/usa la pieza, paso a paso?
4. dependencias_externas: ¿Sin dependencias complejas sin resolver (pagos, auth, APIs de terceros)?
5. coherencia: ¿Las respuestas del cuestionario son coherentes entre sí y con la idea original?
6. viabilidad: ¿Tamaño apropiado para construirse en una sesión? ¿Sin bloqueos técnicos evidentes?

Para criterios con score 0 o 1: genera 1-2 preguntas de seguimiento específicas (solo si NO hay followup_answers).

Responde SOLO con JSON válido, sin markdown:
{"claridad_objecion":0,"alcance_v1":0,"recorrido_cliente":0,"dependencias_externas":0,"coherencia":0,"viabilidad":0,"mensajes":{"claridad_objecion":"...","alcance_v1":"...","recorrido_cliente":"...","dependencias_externas":"...","coherencia":"...","viabilidad":"..."},"followup_questions":[{"id":"f1","text":"...","type":"single","options":["opcion 1","opcion 2","opcion 3"]}]}`

export const CLAUDE_MD_PROMPT = (ideaText, contextText, answersJson, followupAnswersJson, mode) => `Eres un estratega de marketing y ventas senior. Genera un CLAUDE.md completo para esta herramienta.

${modeLine(mode)}IDEA:
${ideaText}
${contextText ? `\n${contextText}\n` : ''}
RESPUESTAS:
${answersJson}
${followupAnswersJson ? `\nRESPUESTAS DE SEGUIMIENTO:\n${followupAnswersJson}` : ''}

Genera el documento con esta estructura exacta (markdown puro, sin JSON):

# [Nombre descriptivo de la herramienta] — v1

## La objeción a resolver
[Qué duda o resistencia tiene el cliente, y cómo esta pieza la resuelve — 2-3 frases directas. Empieza por la objeción, no por la herramienta.]

## Perfil de público objetivo
[Si el contexto incluye un PERFIL DE PÚBLICO OBJETIVO, transcribilo como lista: Rol y nivel de decisión, Objetivo o dolor específico, Objeción principal, Qué necesita ver o sentir para decir que sí, Etapa del proceso de compra, Canal de consumo. Si no hay ese contexto, omití esta sección completa.]

## Lineamientos de marca
[Si el contexto incluye LINEAMIENTOS DE MARCA, resumilos acá — tono, paleta, tipografía, reglas de uso. Si no hay ese contexto, omití esta sección completa.]

## Recorrido del cliente (happy path)
1. [Paso 1 — qué ve/hace el cliente primero]
2. [Paso 2]
3. [Paso 3]

## Criterio de éxito de v1
Al terminar de ver/usar la herramienta, [tipo de cliente] [reacción o decisión concreta esperada] — no un criterio técnico, la señal de que la pieza convenció.

## Complejidad del proyecto
**[Baja / Media / Alta]** — [1 frase que justifica la categoría basada en flujos, integraciones y alcance]

- 🟢 Baja: un flujo principal, sin integraciones externas, datos simples, sin auth compleja
- 🟡 Media: 2-3 flujos, 1-2 integraciones (auth, una API), datos relacionales moderados
- 🔴 Alta: múltiples flujos, pagos reales, tiempo real, múltiples roles o integraciones complejas

## Restricciones
- Plataforma: [web / móvil / desktop / CLI]
- Stack: [preferido o recomendado]
- Integraciones: [listar solo las necesarias para v1, o "ninguna" si aplica]

## Alcance v1 — incluye
- [Feature 1]
- [Feature 2]

## Alcance v1 — excluye (construir después)
- [Cosa 1]
- [Cosa 2]

## Stack recomendado
[Stack simple. HTML/JS para web simple, Next.js para apps, SQLite para datos locales.]

## Referencias visuales
[Solo si la IDEA incluye una sección "Referencias visuales adjuntas": resumí en 1-2 frases por imagen qué guía de diseño aporta cada una — estilo, layout, paleta, patrones de interacción — como contexto para quien construya v1. Si la idea NO incluye esa sección, omití "## Referencias visuales" por completo, sin dejar el título vacío.]

## SEO y visibilidad en IA
[Solo si la plataforma es web Y el proyecto es de cara al público (no un CLI, no una herramienta interna): lista concreta de lo que hay que configurar — meta title/description por página, Open Graph tags, sitemap.xml, robots.txt, verificación de Google Search Console (meta tag o archivo de verificación), datos estructurados JSON-LD si el tipo de contenido lo amerita, URLs semánticas. Sumá también visibilidad para IA: un archivo llms.txt en la raíz que describa el sitio en texto plano para agentes/crawlers de IA, y contenido bien estructurado (FAQs con schema.org/FAQPage, respuestas directas y citables) para que ChatGPT, Perplexity o el buscador de Claude puedan encontrar y citar la herramienta. Si no aplica, omití "## SEO y visibilidad en IA" por completo.]

## Backend y base de datos
[Solo si el proyecto necesita persistir datos compartidos entre usuarios, autenticación, o almacenamiento: recomendá UNA opción concreta de entre las más usadas — Supabase, Firebase, Neon, PlanetScale o Convex — según lo que el proyecto realmente necesita (Supabase o Firebase si hace falta auth + storage + DB en un combo; Neon o PlanetScale si alcanza con una DB relacional gestionada; Convex si el proyecto es reactivo en tiempo real). Si el usuario ya pidió o mencionó una opción específica, usá esa sin importar cuál sea. Incluí los pasos de CLI de la opción elegida. Si el proyecto no necesita backend (todo local o solo cliente), omití "## Backend y base de datos" por completo.]

## Deploy
[Solo si es un proyecto web que se va a desplegar: recomendá UNA opción concreta de entre las más usadas — Netlify, Vercel, Cloudflare Pages, Railway o Render — según el tipo de proyecto (Netlify o Vercel para sitios/apps estáticas o Next.js; Railway o Render si el proyecto corre un servidor persistente o un backend propio). Si el usuario ya pidió o mencionó una opción específica, usá esa. Incluí instalación del CLI, login, y el comando de publicación de la opción elegida. Si no aplica (CLI tool, script local, librería), omití "## Deploy" por completo.]

## Repositorio
[Solo si el proyecto se despliega o necesita control de versiones remoto: GitHub es la opción más usada — pasos para crear el repo (\`gh repo create <nombre> --private --source=. --remote=origin\`) y conectarlo al deploy elegido para que cada push publique solo. Si el usuario ya usa GitLab o Bitbucket, usá esa plataforma en su lugar. Si no aplica, omití "## Repositorio" por completo.]

## v2+ — visión de escalamiento (bloqueada — no ejecutar ahora)
- [Feature futuro]

## Primeros 3 pasos
1. [Acción concreta hoy]
2. [Construir la pieza mínima del recorrido del cliente]
3. [Mostrarla a alguien real y ver si reacciona como se espera]

---
*Generado por CC Brew · No ejecutar v2+ hasta validar v1*

Regla de complejidad: evalúa y elige UNA categoría basándote en señales objetivas del proyecto:
- Baja: 1 flujo principal, sin pagos, sin auth social, sin tiempo real, datos simples (lista, formulario, CRUD básico)
- Media: 2-3 flujos, auth (email/social), 1 API externa, notificaciones, datos con relaciones
- Alta: pagos reales (Stripe/Wompi), tiempo real (sockets), múltiples roles de usuario, más de 2 integraciones externas, lógica de negocio compleja
No menciones tiempo — la categoría es sobre scope y dependencias, no sobre velocidad del desarrollador.

Regla de secciones condicionales (Referencias visuales, SEO, Backend, Deploy, Repositorio): evaluá cada una de forma independiente según lo que ESTE proyecto realmente necesita — no las incluyas todas por default ni las omitas todas por default. Un CLI tool o script local no lleva SEO ni Netlify. Un proyecto que no comparte datos entre usuarios no lleva Supabase. Nunca dejes un título de sección seguido de un placeholder sin completar — si no aplica, el título entero desaparece del documento.`

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
