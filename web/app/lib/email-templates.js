// Plantillas de correo HTML premium para CC Brew vía Resend

const LOGO_SVG = `<img src="https://ccbrew.kitifica.com/logos/ccbrewv3_full.svg" width="200" height="73" alt="CC Brew" style="display:block; border:0;">`;

function baseLayout({ title, previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: #8B5CF6; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0A0A0A;">
  <div style="display: none; max-height: 0px; overflow: hidden;">${previewText || title}</div>
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; background-color: #141414; border: 1px solid #2A2A2A; border-radius: 20px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.6);">
          <!-- Top Accent Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #7c3aed, #8B5CF6, #c4b5fd);"></td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding: 28px 36px 16px; text-align: center;">
              ${LOGO_SVG}
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 0 36px 32px; color: #D4D4D8; font-size: 14px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #0d0d0d; border-top: 1px solid #222222; font-size: 11px; color: #71717A; line-height: 1.5; text-align: center;">
              <p style="margin: 0 0 6px;">© 2026 Kitifica · De idea a herramienta que convence al cliente.</p>
              <p style="margin: 0; color: #52525B;">Si no realizaste esta acción, puedes ignorar este correo con total seguridad.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. Correo de Bienvenida y Confirmación de Cuenta
export function getSignupConfirmationTemplate({ actionUrl, email }) {
  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px; letter-spacing: -0.02em;">
      ¡Bienvenido a CC Brew! 🎉
    </h1>
    <p style="font-size: 14px; color: #A1A1AA; margin: 0 0 20px; line-height: 1.6;">
      Has creado tu cuenta con el correo <strong style="color: #F4F4F5;">${email}</strong>. Tu cuenta arranca automáticamente con <strong style="color: #22c55e;">3 proyectos de prueba gratis</strong> para que estructures tus ideas y generes especificaciones para Claude Code.
    </p>

    <div style="background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #c4b5fd; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        ✨ Lo que obtienes de inmediato:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #D4D4D8; line-height: 1.6;">
        <li>3 proyectos completos de prueba gratis.</li>
        <li>Generación automatizada de tu archivo <code>CLAUDE.md</code>.</li>
        <li>Semáforo de viabilidad con IA y preguntas dirigidas.</li>
      </ul>
    </div>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(124,58,237,0.4); text-align: center;">
            Confirmar cuenta y empezar →
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #71717A; margin: 24px 0 0; text-align: center;">
      El enlace es válido por 24 horas. Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
      <a href="${actionUrl}" style="color: #8B5CF6; word-break: break-all; font-size: 11px;">${actionUrl}</a>
    </p>
  `;

  return {
    subject: '¡Bienvenido a CC Brew! Confirma tu cuenta (3 proyectos gratis)',
    html: baseLayout({
      title: 'Confirma tu cuenta de CC Brew',
      previewText: 'Tus 3 proyectos gratis de bienvenida están listos en CC Brew.',
      contentHtml: content,
    }),
  };
}

// 2. Correo de Recuperación de Contraseña
export function getPasswordResetTemplate({ actionUrl, email }) {
  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px; letter-spacing: -0.02em;">
      Restablece tu contraseña
    </h1>
    <p style="font-size: 14px; color: #A1A1AA; margin: 0 0 20px; line-height: 1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta <strong style="color: #F4F4F5;">${email}</strong> en CC Brew.
    </p>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(124,58,237,0.4); text-align: center;">
            Restablecer contraseña →
          </a>
        </td>
      </tr>
    </table>

    <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px 16px; margin: 20px 0 0;">
      <p style="font-size: 12px; color: #F87171; margin: 0; line-height: 1.5;">
        🔒 Este enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez. Si no solicitaste este cambio, no te preocupes: tu cuenta sigue segura y puedes ignorar este correo.
      </p>
    </div>
  `;

  return {
    subject: 'Restablece tu contraseña de CC Brew',
    html: baseLayout({
      title: 'Restablecer contraseña',
      previewText: 'Enlace para restablecer tu contraseña en CC Brew.',
      contentHtml: content,
    }),
  };
}

// 3. Correo de Magic Link / Acceso Directo
export function getMagicLinkTemplate({ actionUrl, email }) {
  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px; letter-spacing: -0.02em;">
      Tu enlace de acceso está listo
    </h1>
    <p style="font-size: 14px; color: #A1A1AA; margin: 0 0 20px; line-height: 1.6;">
      Haz clic en el botón para iniciar sesión en CC Brew con <strong style="color: #F4F4F5;">${email}</strong> sin necesidad de contraseña.
    </p>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(124,58,237,0.4); text-align: center;">
            Entrar a CC Brew →
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #71717A; margin: 20px 0 0; text-align: center;">
      El enlace es válido por <strong>1 hora</strong>.
    </p>
  `;

  return {
    subject: 'Tu enlace de acceso a CC Brew',
    html: baseLayout({
      title: 'Acceso a CC Brew',
      previewText: 'Entra a CC Brew con un solo clic.',
      contentHtml: content,
    }),
  };
}

// 4. Correo de Recibo de Pago (Invoice / Receipt)
export function getPaymentReceiptTemplate({
  email,
  nombre,
  pack,
  monto,
  minutos,
  wompiRef,
  fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
}) {
  const PACK_NAMES = {
    inicio: { name: 'Plan Inicio', desc: '5 proyectos completos (sin vencimiento)' },
    creador: { name: 'Plan Creador', desc: '12 proyectos completos (sin vencimiento)' },
    estudio: { name: 'Plan Estudio', desc: '20 proyectos completos (sin vencimiento)' },
    api_lifetime: { name: 'Trae tu API (Lifetime)', desc: 'Acceso de por vida · Proyectos ilimitados' },
  };

  const packInfo = PACK_NAMES[pack] || { name: `Plan ${pack}`, desc: `${minutos} proyectos` };
  const montoStr = typeof monto === 'number' ? `$${monto.toFixed(2)} USD` : `$${monto} USD`;

  const content = `
    <div style="display: inline-block; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #4ADE80; margin-bottom: 12px;">
      ✓ Pago completado con éxito
    </div>
    <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px; letter-spacing: -0.02em;">
      Recibo de pago — CC Brew
    </h1>
    <p style="font-size: 14px; color: #A1A1AA; margin: 0 0 24px; line-height: 1.6;">
      Hola ${nombre ? `<strong style="color:#F4F4F5;">${nombre}</strong>` : ''}, gracias por tu compra. Tu plan ya está activo y disponible de inmediato en tu cuenta.
    </p>

    <!-- Resumen del Recibo -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 14px; overflow: hidden; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #262626; font-size: 12px; color: #A1A1AA;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color: #71717A;">Referencia Wompi:</td>
              <td align="right" style="font-family: monospace; color: #D4D4D8; font-weight: 600;">${wompiRef || 'N/A'}</td>
            </tr>
            <tr>
              <td style="color: #71717A; padding-top: 6px;">Fecha:</td>
              <td align="right" style="color: #D4D4D8; padding-top: 6px;">${fecha}</td>
            </tr>
            <tr>
              <td style="color: #71717A; padding-top: 6px;">Cliente:</td>
              <td align="right" style="color: #D4D4D8; padding-top: 6px;">${email}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 18px 20px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">${packInfo.name}</div>
                <div style="font-size: 12px; color: #71717A; margin-top: 2px;">${packInfo.desc}</div>
              </td>
              <td align="right" style="font-size: 18px; font-weight: 800; color: #FFFFFF; vertical-align: top;">
                ${montoStr}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 20px; background-color: #161616; border-top: 1px solid #262626; font-size: 13px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-weight: 700; color: #D4D4D8;">Total pagado:</td>
              <td align="right" style="font-size: 16px; font-weight: 800; color: #4ADE80;">${montoStr}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0 12px;">
      <tr>
        <td align="center">
          <a href="https://ccbrew.kitifica.com" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(124,58,237,0.4); text-align: center;">
            Ir a mis proyectos en CC Brew →
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Recibo de tu compra en CC Brew — ${packInfo.name} (${montoStr})`,
    html: baseLayout({
      title: 'Recibo de compra CC Brew',
      previewText: `Confirmación y recibo de compra de ${packInfo.name} (${montoStr}) en CC Brew.`,
      contentHtml: content,
    }),
  };
}
