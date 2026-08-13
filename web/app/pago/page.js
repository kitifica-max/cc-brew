'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const F = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = '#f04e23';

function LogoMark({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 302.21 302.21" xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: Math.round(size * 0.225), flexShrink: 0, display: 'block' }}>
      <rect width="302.21" height="302.21" rx="68" ry="68" fill="#f0f0f0"/>
      <path fill="#ff582a" d="M242.73,157.22h0c-7.37,0-13.92,4.45-16.91,11.19-2.08,4.69-5.07,8.99-8.99,12.9-8.11,8.11-17.83,12.29-29.14,12.57-.4,0-.79.03-1.19.03-11.82,0-21.91-4.18-30.26-12.53-.96-.96-1.86-1.94-2.7-2.95-6.55-7.75-9.83-16.85-9.83-27.32s3.29-19.6,9.87-27.36c-.84-1.01-1.74-2-2.7-2.96-8.39-8.31-18.5-12.47-30.31-12.47-.4,0-.8.02-1.2.03-8.22,12.57-12.35,26.82-12.35,42.77,0,15.96,4.13,30.21,12.35,42.77,3.08,4.71,6.71,9.18,10.94,13.42,7.07,7.07,14.81,12.51,23.2,16.36,10.05,4.61,21.04,6.93,32.99,6.93,21.93,0,40.68-7.78,56.25-23.36,7.34-7.34,12.94-15.42,16.8-24.22,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
      <path fill="#ff582a" d="M187.74,108.33c11.29.28,20.99,4.42,29.1,12.45,3.91,3.96,6.91,8.29,8.98,13,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-3.86-8.83-9.46-16.95-16.82-24.35-15.57-15.49-34.32-23.23-56.25-23.23-11.93,0-22.91,2.32-32.95,6.92,8.4,3.84,16.16,9.27,23.25,16.32,4.23,4.25,7.86,8.75,10.93,13.48Z"/>
      <path fill="#ff9477" d="M176.78,157.22c-7.37,0-13.92,4.45-16.91,11.19-1.58,3.56-3.69,6.9-6.33,10.01.85,1,1.75,1.99,2.7,2.95,8.35,8.36,18.44,12.53,30.26,12.53.4,0,.79-.02,1.19-.03,2.28-3.49,4.26-7.1,5.91-10.86,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
      <path fill="#ff9477" d="M119.38,193.88c-11.31-.27-21.01-4.43-29.08-12.51-8.36-8.35-12.53-18.44-12.53-30.26s4.18-21.91,12.53-30.26c7.74-7.74,18.17-12.2,29.08-12.51.4-.01.8-.03,1.2-.03,11.81,0,21.91,4.16,30.31,12.47.95.97,1.85,1.95,2.7,2.96,2.62,3.13,4.72,6.48,6.29,10.03,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-1.64-3.76-3.62-7.38-5.89-10.87-3.07-4.73-6.7-9.23-10.93-13.48-7.09-7.05-14.84-12.48-23.25-16.32-10.06-4.6-21.06-6.92-33-6.92-21.93,0-40.66,7.76-56.19,23.29-15.53,15.53-23.3,34.26-23.3,56.19s7.76,40.66,23.3,56.19c15.53,15.53,34.26,23.3,56.19,23.3,11.93,0,22.91-2.32,32.96-6.93-8.39-3.85-16.13-9.29-23.2-16.36-4.23-4.23-7.87-8.71-10.94-13.42Z"/>
    </svg>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#f5f5f5', border: '1.5px solid #e0e0e0',
  borderRadius: 14, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a',
  fontFamily: F, outline: 'none', minHeight: 52, touchAction: 'manipulation',
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#999999',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F,
};

export default function PagoPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user?.email) {
        // email prefilled via session, used server-side
      }
    });
  }, []);

  function formatNumero(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  function formatVencimiento(val) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  async function handlePago() {
    if (!session) return;
    const nombreParts = nombre.trim().split(' ');
    const apellido = nombreParts.slice(1).join(' ') || nombreParts[0];

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/wompi/crear-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nombre: nombreParts[0],
          apellido,
          email: session.user.email,
          telefono: telefono.replace(/\D/g, ''),
          numero,
          vencimiento,
          cvv,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url3ds) {
        setError(data.error || 'Error procesando pago');
        return;
      }
      localStorage.setItem('cc-wompi-txn', data.txnId);
      window.location.href = data.url3ds;
    } catch {
      setError('Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main style={{ height: '100dvh', background: '#1a1a1a' }} />;

  if (!session) {
    return (
      <main style={{ height: '100dvh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontFamily: F, fontSize: 15 }}>
          <a href="/" style={{ color: ORANGE }}>Inicia sesión</a> para continuar.
        </p>
      </main>
    );
  }

  const canSubmit = nombre && numero.replace(/\s/g, '').length >= 15 && vencimiento.length >= 5 && cvv.length >= 3;

  return (
    <main style={{ minHeight: '100dvh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', fontFamily: F, overscrollBehavior: 'none' }}>
      {/* Header */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px 32px', gap: 14 }}>
        <LogoMark size={72} />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            CC Controller
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
            Acceso de por vida · Un solo pago
          </p>
        </div>

        {/* Price badge */}
        <div style={{ background: 'rgba(240,78,35,0.15)', border: '1px solid rgba(240,78,35,0.3)', borderRadius: 20, padding: '10px 24px', marginTop: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: ORANGE, letterSpacing: '-0.04em' }}>$4.99</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,78,35,0.7)', marginLeft: 6 }}>USD</span>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#f0f0f0', borderRadius: '36px 36px 0 0', padding: '28px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 8px 40px rgba(240,78,35,0.10)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 500, color: '#666', lineHeight: 1.55 }}>
            Pago seguro con 3DS. Tarjeta de crédito o débito.
          </p>

          <label style={labelStyle}>Nombre en la tarjeta</label>
          <input
            type="text"
            placeholder="Juan Pérez"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 14 }}>Teléfono (opcional)</label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="7000-0000"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 14 }}>Número de tarjeta</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={numero}
            onChange={e => setNumero(formatNumero(e.target.value))}
            style={{ ...inputStyle, letterSpacing: '0.08em', fontFamily: 'monospace, ' + F }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>Vencimiento</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM/AA"
                value={vencimiento}
                onChange={e => setVencimiento(formatVencimiento(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CVV</label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="•••"
                maxLength={4}
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: '#dc2626', fontWeight: 500, lineHeight: 1.4 }}>
              {error}
            </p>
          )}

          <button
            onClick={handlePago}
            disabled={busy || !canSubmit}
            style={{
              width: '100%', marginTop: 20,
              background: busy || !canSubmit ? '#c0a090' : ORANGE,
              border: 'none', borderRadius: 14, padding: '15px 20px',
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: busy || !canSubmit ? 'default' : 'pointer',
              fontFamily: F, minHeight: 52, touchAction: 'manipulation',
              transition: 'background 200ms',
            }}
          >
            {busy ? 'Procesando...' : 'Pagar $4.99 →'}
          </button>

          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 1.5 }}>
            Serás redirigido a 3DS para verificar tu identidad.<br />
            Pago procesado por Wompi · Acceso de por vida.
          </p>
        </div>

        <div style={{ textAlign: 'center', padding: '16px 0 max(20px, env(safe-area-inset-bottom, 20px))' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999', letterSpacing: '0.03em' }}>
            kitifica.com · CC Controller
          </p>
        </div>
      </div>
    </main>
  );
}
