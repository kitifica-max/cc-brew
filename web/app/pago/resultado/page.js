'use client';
import { useEffect, useState } from 'react';

const F = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = '#f04e23';
const MAX_ATTEMPTS = 18;
const INTERVAL_MS = 2500;

export default function ResultadoPage() {
  const [estado, setEstado] = useState('verificando'); // 'verificando' | 'pagado' | 'fallido' | 'timeout'
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const txnId = localStorage.getItem('cc-wompi-txn');
    if (!txnId) { setEstado('fallido'); setMensaje('No se encontró la transacción.'); return; }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/wompi/verificar?txnId=${encodeURIComponent(txnId)}`);
        const data = await res.json();
        if (data.paid) {
          localStorage.removeItem('cc-wompi-txn');
          setEstado('pagado');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }
        if (data.error && data.error !== 'Transacción no encontrada') {
          setEstado('fallido');
          setMensaje(data.error);
          return;
        }
      } catch {
        // network error, keep polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        setEstado('timeout');
        return;
      }
      setTimeout(poll, INTERVAL_MS);
    };

    // Start after short delay to give 3DS time to complete
    setTimeout(poll, 1500);
  }, []);

  const iconCheck = (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(240,78,35,0.1)"/>
      <path d="M14 24l7 7 13-13" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const iconX = (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(220,38,38,0.1)"/>
      <path d="M16 16l16 16M32 16L16 32" stroke="#dc2626" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  const iconSpinner = (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke="#e0e0e0" strokeWidth="4"/>
      <path d="M24 6a18 18 0 0 1 18 18" stroke={ORANGE} strokeWidth="4" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1s" repeatCount="indefinite"/>
      </path>
    </svg>
  );

  return (
    <main style={{
      minHeight: '100dvh', background: '#1a1a1a', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: '40px 24px',
    }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>

        {estado === 'verificando' && (
          <>
            {iconSpinner}
            <h2 style={{ margin: '20px 0 8px', fontSize: 20, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.03em' }}>
              Verificando pago
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.55 }}>
              Confirmando tu transacción con Wompi…
            </p>
          </>
        )}

        {estado === 'pagado' && (
          <>
            {iconCheck}
            <h2 style={{ margin: '20px 0 8px', fontSize: 20, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.03em' }}>
              ¡Pago exitoso!
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.55 }}>
              Acceso activado. Redirigiendo…
            </p>
          </>
        )}

        {(estado === 'fallido' || estado === 'timeout') && (
          <>
            {iconX}
            <h2 style={{ margin: '20px 0 8px', fontSize: 20, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.03em' }}>
              {estado === 'timeout' ? 'Tiempo agotado' : 'Pago no confirmado'}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.55 }}>
              {estado === 'timeout'
                ? 'No pudimos confirmar el pago. Si fue cobrado, se activará automáticamente vía webhook.'
                : (mensaje || 'El pago no fue aprobado. Verifica los datos de tu tarjeta.')}
            </p>
            <a
              href="/pago"
              style={{
                display: 'block', marginTop: 20, background: ORANGE, borderRadius: 14,
                padding: '14px 20px', fontSize: 15, fontWeight: 700, color: '#fff',
                textDecoration: 'none', touchAction: 'manipulation',
              }}
            >
              Intentar de nuevo
            </a>
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
        kitifica.com · CC Controller
      </p>
    </main>
  );
}
