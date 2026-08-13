import { NextResponse } from 'next/server';
import { markPaid } from '../verificar/route';

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

export async function POST(req) {
  try {
    const body = await req.json();
    const txnId = body.IdTransaccion ?? body.idTransaccion;
    if (!txnId) return NextResponse.json({ ok: false }, { status: 400 });

    // Re-verify with Wompi (don't trust webhook payload alone)
    const token = await getWompiToken();
    const res = await fetch(`https://api.wompi.sv/TransaccionCompra/${txnId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return NextResponse.json({ ok: true }); // ack anyway

    const data = await res.json();
    const paid = data.esAprobada === true || data.resultadoTransaccion === 0;

    if (paid) {
      const userId = data.datosAdicionales?.userId;
      if (userId) await markPaid(userId, txnId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[webhook]', e);
    return NextResponse.json({ ok: true }); // always 200 to Wompi
  }
}
