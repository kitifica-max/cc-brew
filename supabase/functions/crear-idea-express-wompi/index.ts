import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://ccbrew.kitifica.com']

function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

const PRECIO = 1.29

async function getWompiToken(): Promise<string> {
  const res = await fetch('https://id.wompi.sv/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     Deno.env.get('WOMPI_APP_ID')!,
      client_secret: Deno.env.get('WOMPI_API_SECRET')!,
      audience:      'wompi_api',
    }),
  })
  const data = await res.json()
  return data.access_token
}

// Sin auth: pensado para uso anónimo desde el celular, sin cuenta.
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const {
    idea_text, answers, nombre, email,
    numero_tarjeta, cvv, mes_vencimiento, anio_vencimiento,
  } = await req.json()

  if (!idea_text || !answers || !nombre || !email) {
    return Response.json({ error: 'Faltan datos' }, { status: 400, headers: corsHeaders })
  }

  const _sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: check, error: insertErr } = await _sb
    .from('cc_brew_express_checks')
    .insert({ idea_text, answers, price_cents: Math.round(PRECIO * 100) })
    .select('id')
    .single()

  if (insertErr || !check) {
    console.error('Error creando check:', insertErr)
    return Response.json({ error: 'Error al iniciar el check' }, { status: 500, headers: corsHeaders })
  }

  const parts = (nombre as string).trim().split(/\s+/)
  const apellido = parts.length > 1 ? parts[parts.length - 1] : '-'
  const nombreWompi = parts.length > 1 ? parts.slice(0, -1).join(' ') : nombre

  const wompiToken = await getWompiToken()
  const appUrl = Deno.env.get('APP_URL') || 'https://ccbrew.kitifica.com'
  const WEBHOOK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-wompi-idea-express`

  const wompiRes = await fetch('https://api.wompi.sv/TransaccionCompra/3DS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wompiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      monto:        PRECIO,
      email,
      nombre:       nombreWompi,
      apellido,
      telefono:     '00000000',
      ciudad:       'San Salvador',
      direccion:    'N/A',
      codigoPostal: '1101',
      idRegion:     'SV-SS',
      idPais:       'SV',
      descripcion:  'CC Brew — Idea Express',
      urlRedirect:  `${appUrl}/idea-express/resultado?check_id=${check.id}`,
      // Doc de Wompi para TransaccionCompra/3DS muestra urlWebhook top-level
      // (a diferencia de Bitcoin/Quick-Pay/Compra genérica, que lo anidan en
      // "configuracion") — se manda en ambas formas porque un campo de más no
      // rompe nada, y que el webhook nunca dispare sí sería un bug silencioso.
      urlWebhook: WEBHOOK_URL,
      configuracion: {
        urlWebhook: WEBHOOK_URL,
      },
      tarjetaCreditoDebido: {
        numeroTarjeta:   String(numero_tarjeta),
        cvv:             String(cvv),
        mesVencimiento:  Number(mes_vencimiento),
        anioVencimiento: Number(anio_vencimiento),
      },
      datosAdicionales: {
        check_id: check.id,
      },
    }),
  })

  const wompiData = await wompiRes.json()

  if (!wompiRes.ok) {
    console.error('Wompi error:', wompiRes.status, JSON.stringify(wompiData))
    const msg =
      wompiData?.Errors?.[0]?.ErrorMessage ||
      wompiData?.errors?.[0]?.message ||
      wompiData?.Message ||
      wompiData?.titulo ||
      wompiData?.detalle ||
      (typeof wompiData === 'string' ? wompiData : null) ||
      'Error al procesar el pago'
    return Response.json({ error: msg }, { status: 400, headers: corsHeaders })
  }

  if (!wompiData.urlCompletarPago3Ds) {
    console.error('Wompi 3DS URL missing:', wompiData)
    return Response.json({ error: 'Error al iniciar 3DS' }, { status: 500, headers: corsHeaders })
  }

  return Response.json({
    url3ds: wompiData.urlCompletarPago3Ds,
    check_id: check.id,
  }, { headers: corsHeaders })
})
