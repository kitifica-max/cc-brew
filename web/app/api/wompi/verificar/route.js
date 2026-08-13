import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const { access_token } = await res.json();
  return access_token;
}

export async function markPaid(userId, txnId) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await supabase.from('user_access').upsert(
    { user_id: userId, paid_at: new Date().toISOString(), wompi_txn_id: txnId },
    { onConflict: 'user_id' }
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const txnId = searchParams.get('txnId');
    if (!txnId) return NextResponse.json({ error: 'txnId requerido' }, { status: 400 });

    const token = await getWompiToken();
    const res = await fetch(`https://api.wompi.sv/TransaccionCompra/${txnId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return NextResponse.json({ paid: false, error: 'Transacción no encontrada' });

    const data = await res.json();
    const paid = data.esAprobada === true || data.resultadoTransaccion === 0;

    if (paid) {
      const userId = data.datosAdicionales?.userId;
      if (userId) await markPaid(userId, txnId);
    }

    return NextResponse.json({ paid, mensaje: data.mensaje });
  } catch (e) {
    console.error('[verificar]', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
