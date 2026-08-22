'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MODELS, EFFORTS } from '../lib/storage';
import { getApiKey, setApiKey } from '../lib/mcp-client';

const EFFORT_LABELS = { high: 'Alto', medium: 'Medio', low: 'Bajo' };
const EFFORT_DESCS  = { high: 'Más profundo', medium: 'Balanceado', low: 'Más rápido' };

export default function SettingsPanel({ defaultModel, defaultEffort, onSave, onClose }) {
  const [userEmail, setUserEmail] = useState('');
  const [model, setModel]   = useState(defaultModel ?? 'claude-sonnet-4-6');
  const [effort, setEffort] = useState(defaultEffort ?? 'medium');
  const [apiKey, setApiKeyState] = useState(() => getApiKey());
  const saveApiKey = (val) => { setApiKey(val); setApiKeyState(val); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email ?? ''));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1040, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />

      {/* Sheet */}
      <div style={{
        position: 'relative', background: '#141414',
        borderRadius: '16px 16px 0 0', borderTop: '1px solid #2A2A2A',
        padding: `20px 20px calc(20px + env(safe-area-inset-bottom, 0px))`,
        maxHeight: '88dvh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#2A2A2A', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0', letterSpacing: '-0.02em' }}>Configuración</span>
          <button onClick={onClose} aria-label="Cerrar configuración"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#888888', cursor: 'pointer',
                     width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     borderRadius: 8, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Cuenta */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 10 }}>Cuenta</div>
          <div style={{ background: '#0A0A0A', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#f04e23',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {userEmail?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail || 'Cargando...'}
              </div>
              <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>Sesión activa</div>
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>Modelo de IA</div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 12 }}>Modelo por defecto para nuevos proyectos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODELS.map(m => {
              const active = model === m.id;
              return (
                <button key={m.id} onClick={() => setModel(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12,
                           background: active ? 'rgba(240,78,35,0.1)' : '#0A0A0A',
                           border: `1.5px solid ${active ? '#f04e23' : '#2A2A2A'}`,
                           cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms, background 150ms' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%',
                                 border: `2px solid ${active ? '#f04e23' : '#2A2A2A'}`,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 flexShrink: 0, transition: 'border-color 150ms' }}>
                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f04e23' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#E0E0E0' : '#888888' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#2A2A2A', marginTop: 2, fontFamily: 'monospace' }}>{m.id}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CCC API Key */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>CCC API Key</div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 12 }}>Requerida para crear sesiones MCP</div>
          <input
            value={apiKey}
            onChange={e => saveApiKey(e.target.value)}
            placeholder="uk_..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8,
              color: '#E0E0E0', padding: '8px 12px', fontSize: 13, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>
            Genera tu key en app.ccc.app/settings
          </div>
        </div>

        {/* Esfuerzo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 4 }}>Nivel de esfuerzo</div>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 12 }}>Profundidad de análisis de Claude Code</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EFFORTS.map(e => {
              const active = effort === e;
              return (
                <button key={e} onClick={() => setEffort(e)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer', transition: 'all 150ms',
                           border: `1.5px solid ${active ? '#f04e23' : '#2A2A2A'}`,
                           background: active ? 'rgba(240,78,35,0.1)' : '#0A0A0A' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#E0E0E0' : '#888888', marginBottom: 2 }}>
                    {EFFORT_LABELS[e]}
                  </div>
                  <div style={{ fontSize: 10, color: '#525252' }}>{EFFORT_DESCS[e]}</div>
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
