'use client';
import { useState } from 'react';

const PHASES = [
  { n: 1, name: 'Ideación', desc: 'Definir la idea y elegir el stack' },
  { n: 2, name: 'POC Local', desc: 'Construir y probar localmente' },
  { n: 3, name: 'Lanzamiento', desc: 'GitHub + Netlify deploy' },
  { n: 4, name: 'Backend', desc: 'Supabase: datos, auth, storage' },
  { n: 5, name: 'App Directa Completa', desc: 'Manifest, service worker, optimización' },
  { n: 6, name: 'Validación', desc: 'Certificar en kitifica.com/validador/' },
];

export default function PhasePanel({ phase, projectId, onPhaseChange }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const advance = () => {
    if (phase >= 6) return;
    setConfirming(true);
  };

  const confirmAdvance = () => {
    onPhaseChange(projectId, phase + 1);
    setConfirming(false);
    setOpen(false);
  };

  return (
    <>
      {/* Pill en header */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
          padding: '8px 14px', cursor: 'pointer', color: '#fff', fontSize: 11,
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        Fase {phase} · {PHASES[phase - 1]?.name ?? ''} <span style={{ fontSize: 9 }}>▸</span>
      </button>

      {/* Panel inferior */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => { setOpen(false); setConfirming(false); }}
        >
          <div
            style={{ background: '#1a1a1a', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Proceso de desarrollo</span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}
              >×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PHASES.map(p => (
                <div key={p.n} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 12, background: p.n === phase ? 'rgba(232,73,15,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.n === phase ? 'rgba(232,73,15,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    background: p.n < phase ? '#22c55e' : p.n === phase ? '#e8490f' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}>
                    {p.n < phase ? '✓' : p.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.n === phase ? '#fff' : p.n < phase ? '#86efac' : '#666' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {!confirming && phase > 1 && (
              <button
                onClick={() => { onPhaseChange(projectId, phase - 1); setOpen(false); }}
                style={{ width: '100%', marginTop: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px', color: '#aaa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ← Retroceder a Fase {phase - 1}
              </button>
            )}
            {!confirming && phase < 6 && (
              <button
                onClick={advance}
                style={{ width: '100%', marginTop: phase > 1 ? 8 : 16, background: '#e8490f', border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Avanzar a Fase {phase + 1} · {PHASES[phase]?.name} →
              </button>
            )}

            {confirming && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>¿Confirmas que quieres avanzar a Fase {phase + 1}? Esto actualizará las instrucciones de Claude.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setConfirming(false)}
                    style={{ flex: 1, background: '#2a2a2a', border: 'none', borderRadius: 10, padding: 12, color: '#fff', cursor: 'pointer' }}
                  >Cancelar</button>
                  <button
                    onClick={confirmAdvance}
                    style={{ flex: 2, background: '#e8490f', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >Confirmar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
