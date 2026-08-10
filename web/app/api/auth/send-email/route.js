import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;

export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  if (HOOK_SECRET && authHeader !== `Bearer ${HOOK_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body?.user?.email;
  const { token_hash, redirect_to, email_action_type } = body?.email_data ?? {};

  if (!email || !token_hash) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const redirectTo = redirect_to || 'https://ccc.kitifica.com';
  const magicLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type ?? 'magiclink'}&redirect_to=${encodeURIComponent(redirectTo)}`;

  try {
    await resend.emails.send({
      from: 'CC Controller <noreply@kitifica.com>',
      to: email,
      subject: 'Tu enlace de acceso a CC Controller',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fde8e4;border-radius:24px;">
          <h1 style="color:#1a1a1a;font-size:22px;font-weight:800;margin:0 0 8px;">CC Controller</h1>
          <p style="color:#6b5e5a;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Haz clic para entrar. Válido por 1 hora, solo desde este dispositivo.
          </p>
          <a href="${magicLink}"
             style="display:inline-block;background:#f04e23;color:#fff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:14px;">
            Entrar a CC Controller
          </a>
          <p style="color:#b0a09a;font-size:12px;margin:24px 0 0;">
            Si no pediste este enlace, ignora este correo.
          </p>
        </div>
      `,
    });
    return Response.json({});
  } catch (err) {
    console.error('[send-email hook]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
