import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function validarFirma(body: string, secret: string, hashRecibido: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return timingSafeEqual(hash.toLowerCase(), hashRecibido.toLowerCase())
  } catch {
    return false
  }
}

const VERDICT_PROMPT = `Sos CC Brew, un evaluador implacable de ideas de negocio — técnico, sin rodeos, no un cheerleader.
Te doy una idea y 3 respuestas cortas de quien la tiene. Dame un veredicto EXPRESS, no el análisis completo:

- decision: "BUILD", "RETHINK", o "DON'T BUILD"
- por_que: 2-3 frases directas, en español, explicando la decisión

Respondé ÚNICAMENTE con JSON válido: {"decision": "...", "por_que": "..."}`

async function generarVeredicto(ideaText: string, answers: Record<string, string>): Promise<{ decision: string; por_que: string }> {
  const contenido = `Idea: ${ideaText}\n\nRespuestas:\n${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: VERDICT_PROMPT,
      messages: [{ role: 'user', content: contenido }],
    }),
  })

  const data = await res.json()
  const text = data?.content?.[0]?.text ?? ''
  try {
    const parsed = JSON.parse(text)
    return { decision: parsed.decision, por_que: parsed.por_que }
  } catch {
    console.error('Veredicto no parseable:', text)
    return { decision: 'RETHINK', por_que: 'No pudimos generar un veredicto claro esta vez — probá de nuevo o usá la evaluación completa gratis en Claude Code.' }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const apiSecret = Deno.env.get('WOMPI_API_SECRET_IDEA_EXPRESS')
    if (!apiSecret) return new Response('Config error', { status: 500 })

    const bodyRaw = await req.text()
    const wompiHash = req.headers.get('wompi_hash') || ''

    const firmaValida = await validarFirma(bodyRaw, apiSecret, wompiHash)
    if (!firmaValida) {
      console.warn('Firma Wompi inválida')
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = JSON.parse(bodyRaw)
    console.log('Webhook Idea Express recibido:', JSON.stringify(payload))

    const datosAd: Record<string, string> = payload.DatosAdicionales || payload.datosAdicionales || {}
    const checkId = datosAd.check_id
    if (!checkId) {
      // No es de este flujo (probablemente el webhook de minutos) — ignorar.
      return new Response('ok', { status: 200 })
    }

    const wompiRef = String(payload.IdTransaccion || payload.idTransaccion || '')

    const _sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Idempotencia: si ya tiene wompi_ref, esta transacción ya se procesó.
    const { data: existing } = await _sb
      .from('cc_brew_express_checks')
      .select('id, idea_text, answers, wompi_ref')
      .eq('id', checkId)
      .maybeSingle()

    if (!existing) {
      console.warn('check_id desconocido:', checkId)
      return new Response('ok', { status: 200 })
    }
    if (existing.wompi_ref) {
      console.log(`Check ya procesado, ignorando: ${checkId}`)
      return new Response('ok', { status: 200 })
    }

    const aprobada = payload.ResultadoTransaccion === 'ExitosaAprobada' && payload.EsProductiva

    if (!aprobada) {
      await _sb.from('cc_brew_express_checks')
        .update({ status: 'failed', wompi_ref: wompiRef || null })
        .eq('id', checkId)
      return new Response('ok', { status: 200 })
    }

    const verdict = await generarVeredicto(existing.idea_text, existing.answers)

    await _sb.from('cc_brew_express_checks')
      .update({
        status: 'done',
        verdict,
        wompi_ref: wompiRef,
        paid_at: new Date().toISOString(),
      })
      .eq('id', checkId)

    console.log(`✅ Idea Express resuelto — check: ${checkId} | decision: ${verdict.decision}`)

    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('webhook-wompi-idea-express error:', err)
    return new Response('ok', { status: 200 })
  }
})
