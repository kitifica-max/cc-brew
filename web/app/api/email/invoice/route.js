import { Resend } from 'resend';
import { getPaymentReceiptTemplate } from '../../../lib/email-templates';

export async function POST(req) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey || !(authHeader === `Bearer ${serviceKey}` || authHeader === serviceKey)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, nombre, pack, monto, minutos, wompiRef } = body;

  if (!email || !pack) {
    return Response.json({ error: 'Missing email or pack' }, { status: 400 });
  }

  const resend = new Resend(resendApiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CC Brew <noreply@kitifica.com>';

  const template = getPaymentReceiptTemplate({
    email,
    nombre,
    pack,
    monto,
    minutos,
    wompiRef,
  });

  const { data, error: resendError } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: template.subject,
    html: template.html,
  });

  if (resendError) {
    console.error('[invoice-email] Resend error:', resendError);
    return Response.json({ error: resendError.message }, { status: 500 });
  }

  return Response.json({ success: true, id: data?.id });
}
