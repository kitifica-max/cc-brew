import { Resend } from 'resend';

export async function POST(req) {
  const resend = new Resend(process.env.RESEND_API_KEY);
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
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <div style="height:5px;background:linear-gradient(90deg,#f04e23,#ff7a52);"></div>
          <div style="padding:36px 36px 28px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
              <svg width="36" height="36" viewBox="0 0 302.21 302.21" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#333" width="302.21" height="302.21"/>
                <path fill="#ff582a" d="M242.73,157.22h0c-7.37,0-13.92,4.45-16.91,11.19-2.08,4.69-5.07,8.99-8.99,12.9-8.11,8.11-17.83,12.29-29.14,12.57-.4,0-.79.03-1.19.03-11.82,0-21.91-4.18-30.26-12.53-.96-.96-1.86-1.94-2.7-2.95-6.55-7.75-9.83-16.85-9.83-27.32s3.29-19.6,9.87-27.36c-.84-1.01-1.74-2-2.7-2.96-8.39-8.31-18.5-12.47-30.31-12.47-.4,0-.8.02-1.2.03-8.22,12.57-12.35,26.82-12.35,42.77,0,15.96,4.13,30.21,12.35,42.77,3.08,4.71,6.71,9.18,10.94,13.42,7.07,7.07,14.81,12.51,23.2,16.36,10.05,4.61,21.04,6.93,32.99,6.93,21.93,0,40.68-7.78,56.25-23.36,7.34-7.34,12.94-15.42,16.8-24.22,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
                <path fill="#ff582a" d="M187.74,108.33c11.29.28,20.99,4.42,29.1,12.45,3.91,3.96,6.91,8.29,8.98,13,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-3.86-8.83-9.46-16.95-16.82-24.35-15.57-15.49-34.32-23.23-56.25-23.23-11.93,0-22.91,2.32-32.95,6.92,8.4,3.84,16.16,9.27,23.25,16.32,4.23,4.25,7.86,8.75,10.93,13.48Z"/>
                <path fill="#ff9477" d="M176.78,157.22c-7.37,0-13.92,4.45-16.91,11.19-1.58,3.56-3.69,6.9-6.33,10.01.85,1,1.75,1.99,2.7,2.95,8.35,8.36,18.44,12.53,30.26,12.53.4,0,.79-.02,1.19-.03,2.28-3.49,4.26-7.1,5.91-10.86,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
                <path fill="#ff9477" d="M119.38,193.88c-11.31-.27-21.01-4.43-29.08-12.51-8.36-8.35-12.53-18.44-12.53-30.26s4.18-21.91,12.53-30.26c7.74-7.74,18.17-12.2,29.08-12.51.4-.01.8-.03,1.2-.03,11.81,0,21.91,4.16,30.31,12.47.95.97,1.85,1.95,2.7,2.96,2.62,3.13,4.72,6.48,6.29,10.03,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-1.64-3.76-3.62-7.38-5.89-10.87-3.07-4.73-6.7-9.23-10.93-13.48-7.09-7.05-14.84-12.48-23.25-16.32-10.06-4.6-21.06-6.92-33-6.92-21.93,0-40.66,7.76-56.19,23.29-15.53,15.53-23.3,34.26-23.3,56.19s7.76,40.66,23.3,56.19c15.53,15.53,34.26,23.3,56.19,23.3,11.93,0,22.91-2.32,32.96-6.93-8.39-3.85-16.13-9.29-23.2-16.36-4.23-4.23-7.87-8.71-10.94-13.42Z"/>
              </svg>
              <span style="font-size:15px;font-weight:800;color:#1a1a1a;letter-spacing:-0.02em;">CC Controller</span>
            </div>
            <h1 style="font-size:22px;font-weight:800;color:#1a1a1a;margin:0 0 12px;letter-spacing:-0.02em;">Tu enlace de acceso está listo</h1>
            <p style="font-size:14px;line-height:1.65;color:#666666;margin:0 0 28px;">Haz clic para entrar. Válido por <strong style="color:#1a1a1a;">1 hora</strong>, solo desde este dispositivo.</p>
            <a href="${magicLink}" style="display:block;background:#f04e23;color:#ffffff;text-decoration:none;border-radius:14px;padding:15px 28px;font-size:14px;font-weight:700;text-align:center;">Entrar a CC Controller →</a>
          </div>
          <div style="background:#f5f5f5;border-top:1px solid #e5e5e5;padding:18px 36px;">
            <p style="font-size:11px;color:#aaaaaa;margin:0;line-height:1.6;">Si no pediste este enlace, ignora este correo.<br><strong style="color:#777777;">kitifica.com</strong> · noreply@kitifica.com</p>
          </div>
        </div>
      `,
    });
    return Response.json({});
  } catch (err) {
    console.error('[send-email hook]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
