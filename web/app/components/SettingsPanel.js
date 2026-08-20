'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MODELS, EFFORTS } from '../lib/storage';

const EFFORT_LABELS = { high: 'Alto', medium: 'Medio', low: 'Bajo' };
const EFFORT_DESCS  = { high: 'Más profundo', medium: 'Balanceado', low: 'Más rápido' };

export default function SettingsPanel({ defaultModel, defaultEffort, onSave, onClose }) {
  const [userEmail, setUserEmail] = useState('');
  const [model, setModel]   = useState(defaultModel ?? 'claude-sonnet-4-6');
  const [effort, setEffort] = useState(defaultEffort ?? 'medium');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email ?? ''));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1040, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      {/* Sheet */}
      <div style={{
        position: 'relative', background: '#1E293B',
        borderRadius: '16px 16px 0 0', borderTop: '1px solid #334155',
        padding: `20px 20px calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: '88dvh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#334155', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.02em' }}>Configuración</span>
          <button onClick={onClose} aria-label="Cerrar configuración"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer',
                     width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     borderRadius: 8, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Cuenta */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 10 }}>Cuenta</div>
          <div style={{ background: '#0F172A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#f04e23',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {userEmail?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail || 'Cargando...'}
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Sesión activa</div>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                       borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Salir
            </button>
          </div>
        </div>

        {/* Modelo */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 4 }}>Modelo de IA</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>Modelo por defecto para nuevos proyectos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODELS.map(m => {
              const active = model === m.id;
              return (
                <button key={m.id} onClick={() => setModel(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12,
                           background: active ? 'rgba(240,78,35,0.1)' : '#0F172A',
                           border: `1.5px solid ${active ? '#f04e23' : '#1E293B'}`,
                           cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms, background 150ms' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%',
                                 border: `2px solid ${active ? '#f04e23' : '#334155'}`,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 flexShrink: 0, transition: 'border-color 150ms' }}>
                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f04e23' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#E2E8F0' : '#64748B' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#334155', marginTop: 2, fontFamily: 'monospace' }}>{m.id}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Esfuerzo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 4 }}>Nivel de esfuerzo</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>Profundidad de análisis de Claude Code</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EFFORTS.map(e => {
              const active = effort === e;
              return (
                <button key={e} onClick={() => setEffort(e)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer', transition: 'all 150ms',
                           border: `1.5px solid ${active ? '#f04e23' : '#1E293B'}`,
                           background: active ? 'rgba(240,78,35,0.1)' : '#0F172A' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#E2E8F0' : '#64748B', marginBottom: 2 }}>
                    {EFFORT_LABELS[e]}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569' }}>{EFFORT_DESCS[e]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Guardar */}
        <button onClick={() => { onSave(model, effort); onClose(); }}
          style={{ width: '100%', padding: '15px 0', background: '#f04e23', color: '#fff', border: 'none',
                   borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                   boxShadow: '0 4px 16px rgba(240,78,35,0.35)', letterSpacing: '-0.01em' }}>
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
