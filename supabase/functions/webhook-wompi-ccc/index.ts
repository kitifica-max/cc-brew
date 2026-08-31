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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const apiSecret = Deno.env.get('WOMPI_API_SECRET')
    if (!apiSecret) return new Response('Config error', { status: 500 })

    const bodyRaw = await req.text()
    const wompiHash = req.headers.get('wompi_hash') || ''

    const firmaValida = await validarFirma(bodyRaw, apiSecret, wompiHash)
    if (!firmaValida) {
      console.warn('Firma Wompi inválida')
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = JSON.parse(bodyRaw)
    console.log('Webhook CC Creator recibido:', JSON.stringify(payload))

    if (payload.ResultadoTransaccion !== 'ExitosaAprobada') return new Response('ok', { status: 200 })
    if (!payload.EsProductiva) return new Response('ok', { status: 200 })

    const datosAd: Record<string, string> = payload.DatosAdicionales || payload.datosAdicionales || {}
    if (!datosAd.pack || !datosAd.user_id || !datosAd.minutos) {
      console.warn('DatosAdicionales incompletos:', datosAd)
      return new Response('ok', { status: 200 })
    }

    const pack    = datosAd.pack
    const userId  = datosAd.user_id
    const minutos = parseInt(datosAd.minutos, 10)
    const wompiRef = String(payload.IdTransaccion || payload.idTransaccion || '')
    const esApiLifetime = pack === 'api_lifetime'

    // api_lifetime no acredita minutos (minutos=0 a propósito) — activa
    // "Trae tu API" en su lugar. Para el resto de los packs, 0 minutos sí
    // es un dato inválido y se descarta.
    if (!esApiLifetime && minutos <= 0) return new Response('ok', { status: 200 })

    const _sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Idempotencia: evitar procesar la misma transacción dos veces
    const { data: existing } = await _sb
      .from('minutes_transactions')
      .select('id')
      .eq('wompi_ref', wompiRef)
      .maybeSingle()

    if (existing) {
      console.log(`Transacción duplicada ignorada: ${wompiRef}`)
      return new Response('ok', { status: 200 })
    }

    const monto = parseFloat(String(payload.Monto || 0))

    await _sb.from('minutes_transactions').insert({
      user_id:   userId,
      pack,
      minutos,
      monto,
      wompi_ref: wompiRef,
    })

    if (esApiLifetime) {
      await _sb.rpc('activar_byo_api', { p_user_id: userId })
      console.log(`✅ "Trae tu API" activado — user: ${userId}`)
    } else {
      await _sb.rpc('acreditar_minutos', { p_user_id: userId, p_minutos: minutos })
      console.log(`✅ Minutos acreditados — user: ${userId} | pack: ${pack} | minutos: ${minutos}`)
    }

    // Enviar correo de recibo / invoice vía Resend
    try {
      const userRes = await _sb.auth.admin.getUserById(userId)
      const userEmail = payload.Email || payload.email || userRes?.data?.user?.email
      const userName = [payload.Nombre || payload.nombre, payload.Apellido || payload.apellido].filter(Boolean).join(' ')
      if (userEmail) {
        const appUrl = Deno.env.get('APP_URL') || 'https://ccbrew.kitifica.com'
        await fetch(`${appUrl}/api/email/invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            email: userEmail,
            nombre: userName,
            pack,
            monto,
            minutos,
            wompiRef,
          }),
        })
        console.log(`📧 Recibo de pago enviado a ${userEmail}`)
      }
    } catch (emailErr) {
      console.warn('Error al disparar recibo de correo:', emailErr)
    }

    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('webhook-wompi-ccc error:', err)
    return new Response('ok', { status: 200 })
  }
})
