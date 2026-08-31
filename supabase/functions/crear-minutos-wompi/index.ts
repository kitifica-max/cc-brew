import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ccc.kitifica.com queda temporalmente mientras el redirect 301 termina de propagarse a sesiones/PWAs ya abiertas.
const ALLOWED_ORIGINS = ['https://ccbrew.kitifica.com', 'https://ccc.kitifica.com']

function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// minutos: 0 en api_lifetime — no acredita créditos, el webhook lo detecta
// por el nombre del pack y activa "Trae tu API" en vez de sumar saldo.
const PACKS: Record<string, { minutos: number; monto: number; label: string }> = {
  inicio:      { minutos: 5,   monto: 4.00,  label: 'Inicio — 5 proyectos'        },
  creador:     { minutos: 12,  monto: 9.00,  label: 'Creador — 12 proyectos'      },
  estudio:     { minutos: 20,  monto: 12.00, label: 'Estudio — 20 proyectos'      },
  api_lifetime:{ minutos: 0,   monto: 29.00, label: 'Trae tu API — acceso de por vida' },
}

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

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return Response.json({ error: 'No auth' }, { status: 401, headers: corsHeaders })
  }

  const sbUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await sbUser.auth.getUser()
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401, headers: corsHeaders })
  }

  const { pack, nombre, email, numero_tarjeta, cvv, mes_vencimiento, anio_vencimiento } = await req.json()

  const packData = PACKS[pack as string]
  if (!packData) {
    return Response.json({ error: 'Pack inválido' }, { status: 400, headers: corsHeaders })
  }

  const parts = (nombre as string).trim().split(/\s+/)
  const apellido = parts.length > 1 ? parts[parts.length - 1] : '-'
  const nombreWompi = parts.length > 1 ? parts.slice(0, -1).join(' ') : nombre

  const wompiToken = await getWompiToken()
  const appUrl = Deno.env.get('APP_URL') || 'https://ccbrew.kitifica.com'

  const wompiRes = await fetch('https://api.wompi.sv/TransaccionCompra/3DS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${wompiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      monto:        packData.monto,
      email:        email || user.email,
      nombre:       nombreWompi,
      apellido,
      telefono:     '00000000',
      ciudad:       'San Salvador',
      direccion:    'N/A',
      codigoPostal: '1101',
      idRegion:     'SV-SS',
      idPais:       'SV',
      descripcion:  `CC Brew ${packData.label}`,
      urlRedirect:  `${appUrl}/pago-exitoso`,
      tarjetaCreditoDebido: {
        numeroTarjeta:   String(numero_tarjeta),
        cvv:             String(cvv),
        mesVencimiento:  Number(mes_vencimiento),
        anioVencimiento: Number(anio_vencimiento),
      },
      datosAdicionales: {
        pack,
        user_id: user.id,
        minutos: String(packData.minutos),
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
      `Error al procesar el pago`
    return Response.json({ error: msg }, { status: 400, headers: corsHeaders })
  }

  if (!wompiData.urlCompletarPago3Ds) {
    console.error('Wompi 3DS URL missing:', wompiData)
    return Response.json({ error: 'Error al iniciar 3DS' }, { status: 500, headers: corsHeaders })
  }

  return Response.json({
    url3ds: wompiData.urlCompletarPago3Ds,
    txn_id: wompiData.idTransaccion,
  }, { headers: corsHeaders })
})
