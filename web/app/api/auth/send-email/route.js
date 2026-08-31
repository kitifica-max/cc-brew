import { Resend } from 'resend';
import { Webhook } from 'standardwebhooks';
import {
  getSignupConfirmationTemplate,
  getPasswordResetTemplate,
  getMagicLinkTemplate,
} from '../../../lib/email-templates';

export async function POST(req) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });
  }

  const rawBody = await req.text();

  // Verificación con la librería oficial de standardwebhooks que usa Supabase.
  // El secreto viene como "v1,whsec_<base64>" — la librería espera solo "whsec_<base64>".
  const secret = process.env.SEND_EMAIL_HOOK_SECRET || process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    return Response.json({ error: 'Missing hook secret' }, { status: 500 });
  }

  const hookSecret = secret.replace(/^v1,/, '');

  const headers = {
    'webhook-id':        req.headers.get('webhook-id') ?? '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
  };

  let body;
  try {
    const wh = new Webhook(hookSecret);
    body = wh.verify(rawBody, headers);
  } catch (err) {
    console.error('[send-email] signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const email = body?.user?.email;
  const { token_hash, redirect_to, email_action_type } = body?.email_data ?? {};

  if (!email || !token_hash) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const actionType = email_action_type || 'magiclink';
  const redirectTo = redirect_to || 'https://ccbrew.kitifica.com';
  const actionUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(actionType)}&redirect_to=${encodeURIComponent(redirectTo)}`;

  let emailData;
  if (actionType === 'signup' || actionType === 'invite') {
    emailData = getSignupConfirmationTemplate({ actionUrl, email });
  } else if (actionType === 'recovery') {
    emailData = getPasswordResetTemplate({ actionUrl, email });
  } else {
    emailData = getMagicLinkTemplate({ actionUrl, email });
  }

  const resend = new Resend(resendApiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CC Brew <noreply@kitifica.com>';

  const { data, error: resendError } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: emailData.subject,
    html: emailData.html,
  });

  if (resendError) {
    console.error('[send-email hook] Resend error:', resendError);
    return Response.json({ error: resendError.message }, { status: 500 });
  }

  return Response.json({ success: true, id: data?.id });
}
