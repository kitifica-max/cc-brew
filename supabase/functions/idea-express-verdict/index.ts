const ALLOWED_ORIGINS = ['https://ccbrew.kitifica.com']

function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

const VERDICT_PROMPT = `Sos CC Brew, un evaluador implacable de ideas de negocio — técnico, sin rodeos, no un cheerleader.
Te doy una idea y 3 respuestas cortas de quien la tiene. Dame un veredicto EXPRESS, lo más breve posible:

- decision: "BUILD", "RETHINK", o "DON'T BUILD"
- por_que: 1-2 frases directas, en español, explicando la decisión. Nada de rodeos.

Respondé ÚNICAMENTE con el JSON, sin markdown ni texto alrededor: {"decision": "...", "por_que": "..."}`

function extraerJson(text: string): { decision: string; por_que: string } {
  const match = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(match ? match[0] : text)
  return { decision: parsed.decision, por_que: parsed.por_que }
}

// Sin auth: check express gratis, sin cuenta ni pago — solo un funnel hacia la evaluación completa.
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { idea_text, answers } = await req.json()
  if (!idea_text || !answers) {
    return Response.json({ error: 'Faltan datos' }, { status: 400, headers: corsHeaders })
  }

  const contenido = `Idea: ${idea_text}\n\nRespuestas:\n${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: VERDICT_PROMPT,
      messages: [{ role: 'user', content: contenido }],
    }),
  })

  const data = await res.json()
  const text = data?.content?.[0]?.text ?? ''
  try {
    return Response.json(extraerJson(text), { headers: corsHeaders })
  } catch {
    console.error('Veredicto no parseable:', text)
    return Response.json({
      decision: 'RETHINK',
      por_que: 'No pudimos generar un veredicto claro esta vez — probá de nuevo o usá la evaluación completa gratis.',
    }, { headers: corsHeaders })
  }
})
