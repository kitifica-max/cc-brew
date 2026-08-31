'use client';
import { useEffect, useState } from 'react';

export default function PagoExitoso() {
  const [segundos, setSegundos] = useState(5);

  useEffect(() => {
    try { localStorage.removeItem('ccc_txn'); } catch {}
    const iv = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { clearInterval(iv); window.location.href = '/'; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'inherit',
    }}>
      <div style={{
        background: '#141414', border: '1px solid #2A2A2A', borderRadius: 20,
        padding: 32, maxWidth: 340, width: '100%', textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#E0E0E0', margin: '0 0 8px' }}>¡Listo!</h1>
        <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.6, margin: '0 0 24px' }}>
          Tu pago fue procesado. Ya está disponible en tu cuenta.
        </p>
        <button onClick={() => window.location.href = '/'}
          style={{
            width: '100%', padding: '14px 0', background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
          }}>
          Volver a CC Brew
        </button>
        <p style={{ fontSize: 12, color: '#3A3A3A', marginTop: 12 }}>
          Redirigiendo en {segundos}s...
        </p>
      </div>
    </div>
  );
}
