'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const DECISION_LABEL = {
  BUILD: { text: 'BUILD', color: '#10B981' },
  RETHINK: { text: 'RETHINK', color: '#F59E0B' },
  "DON'T BUILD": { text: "DON'T BUILD", color: '#EF4444' },
};

export default function IdeaExpressResultado() {
  return (
    <Suspense fallback={null}>
      <Resultado />
    </Suspense>
  );
}

function Resultado() {
  const params = useSearchParams();
  const checkId = params.get('check_id');
  const [state, setState] = useState('polling'); // polling | done | failed | timeout
  const [verdict, setVerdict] = useState(null);

  useEffect(() => {
    if (!checkId) { setState('failed'); return; }
    let attempts = 0;
    let cancelled = false;

    async function poll() {
      attempts++;
      const { data, error } = await supabase.rpc('cc_brew_express_check_get', { p_id: checkId });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;

      if (!error && row?.status === 'done') { setVerdict(row.verdict); setState('done'); return; }
      if (!error && row?.status === 'failed') { setState('failed'); return; }
      if (attempts >= 30) { setState('timeout'); return; }
      setTimeout(poll, 2000);
    }
    poll();
    return () => { cancelled = true; };
  }, [checkId]);

  const decisionStyle = verdict?.decision ? DECISION_LABEL[verdict.decision] : null;

  return (
    <main style={{
      minHeight: '100dvh', background: '#0A0A0A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
    }}>
      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        {state === 'polling' && (
          <>
            <div style={{ width: 40, height: 40, border: '3px solid #2A2A2A', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#E0E0E0', margin: '0 0 8px' }}>Confirmando tu pago...</h1>
            <p style={{ fontSize: 13, color: '#525252', margin: 0 }}>Puede tardar unos segundos. No cierres esta página.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {state === 'done' && verdict && (
          <>
            <div style={{
              display: 'inline-block', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
              color: decisionStyle?.color || '#E0E0E0', border: `1.5px solid ${decisionStyle?.color || '#525252'}`,
              borderRadius: 8, padding: '6px 14px', marginBottom: 16,
            }}>
              {decisionStyle?.text || verdict.decision}
            </div>
            <p style={{ fontSize: 14, color: '#E0E0E0', lineHeight: 1.6, margin: '0 0 24px', textAlign: 'left' }}>
              {verdict.por_que}
            </p>
            <a href="/#claude-code" style={{
              display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 0',
              background: '#7c3aed', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700,
              textDecoration: 'none', marginBottom: 10,
            }}>
              Evaluación completa gratis (14 criterios + Trends)
            </a>
            <a href="/idea-express" style={{ fontSize: 12, color: '#525252' }}>Validar otra idea →</a>
          </>
        )}

        {state === 'failed' && (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#E0E0E0', margin: '0 0 8px' }}>El pago no se pudo procesar</h1>
            <p style={{ fontSize: 13, color: '#525252', margin: '0 0 20px' }}>No se completó el cobro de $1.29 — no se te cobró nada.</p>
            <a href="/idea-express" style={{
              display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 0',
              background: '#7c3aed', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              Intentar de nuevo
            </a>
          </>
        )}

        {state === 'timeout' && (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#E0E0E0', margin: '0 0 8px' }}>Está tardando más de lo normal</h1>
            <p style={{ fontSize: 13, color: '#525252', margin: 0 }}>
              Tu pago puede haberse confirmado igual — revisá tu correo en unos minutos, o escribinos con este código: <code style={{ color: '#888' }}>{checkId}</code>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
