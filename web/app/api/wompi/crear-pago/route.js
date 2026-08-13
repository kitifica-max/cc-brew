import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MONTO = 4.99;
const REDIRECT_URL = 'https://ccc.kitifica.com/pago/resultado';
const WEBHOOK_URL = 'https://ccc.kitifica.com/api/wompi/webhook';

async function getWompiToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.WOMPI_APP_ID,
    client_secret: process.env.WOMPI_API_SECRET,
    audience: 'wompi_api',
  });
  const res = await fetch('https://id.wompi.sv/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Wompi auth failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verify user JWT
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { nombre, apellido, email, telefono, numero, vencimiento, cvv } = await req.json();
    if (!nombre || !email || !numero || !vencimiento || !cvv) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const [mesStr, anioStr] = vencimiento.split('/');
    const mes = parseInt(mesStr, 10);
    const anio = parseInt(anioStr?.length === 2 ? `20${anioStr}` : anioStr, 10);
    if (!mes || !anio) return NextResponse.json({ error: 'Vencimiento inválido' }, { status: 400 });

    const token = await getWompiToken();

    const payload = {
      tarjetaCreditoDebido: {
        numeroTarjeta: numero.replace(/\s/g, ''),
        cvv,
        mesVencimiento: mes,
        anioVencimiento: anio,
      },
      monto: MONTO,
      urlRedirect: REDIRECT_URL,
      nombre,
      apellido: apellido || nombre,
      email,
      ciudad: 'San Salvador',
      direccion: 'San Salvador',
      idPais: 'SV',
      idRegion: 'SV-SS',
      codigoPostal: '01101',
      telefono: telefono || '00000000',
      configuracion: {
        urlWebhook: WEBHOOK_URL,
        notificarTransaccionCliente: true,
      },
      datosAdicionales: {
        userId: user.id,
      },
    };

    const wompiRes = await fetch('https://api.wompi.sv/TransaccionCompra/3DS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const wompiData = await wompiRes.json();
    if (!wompiRes.ok || !wompiData.urlCompletarPago3Ds) {
      return NextResponse.json({ error: wompiData.mensaje || 'Error Wompi' }, { status: 400 });
    }

    return NextResponse.json({
      url3ds: wompiData.urlCompletarPago3Ds,
      txnId: wompiData.idTransaccion,
    });
  } catch (e) {
    console.error('[crear-pago]', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
