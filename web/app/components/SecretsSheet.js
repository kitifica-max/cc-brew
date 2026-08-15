'use client';
import { useState, useEffect } from 'react';

const CATEGORIES = [
  {
    key: 'github',
    label: 'GitHub',
    minPhase: 3,
    vars: [
      { key: 'GITHUB_TOKEN', label: 'Token de acceso', help: 'Crea en github.com/settings/tokens → Fine-grained token → scope: repo' },
    ],
  },
  {
    key: 'netlify',
    label: 'Netlify',
    minPhase: 3,
    vars: [
      { key: 'NETLIFY_AUTH_TOKEN', label: 'Auth token', help: 'Crea en app.netlify.com/user/applications → Personal access tokens (usado por netlify-cli)' },
      { key: 'NETLIFY_SITE_ID', label: 'Site ID', help: 'Lo encontrarás en Site settings → General → Site ID' },
    ],
  },
  {
    key: 'supabase',
    label: 'Supabase',
    minPhase: 4,
    vars: [
      { key: 'SUPABASE_URL', label: 'Project URL', help: 'En supabase.com/dashboard → Settings → API → Project URL' },
      { key: 'SUPABASE_ANON_KEY', label: 'Anon key (pública)', help: 'En supabase.com/dashboard → Settings → API → anon public' },
      { key: 'SUPABASE_SERVICE_KEY', label: 'Service key (privada)', help: 'En supabase.com/dashboard → Settings → API → service_role (¡solo en backend!)' },
    ],
  },
];

const ALL_PREDEFINED_KEYS = CATEGORIES.flatMap(c => c.vars).map(v => v.key);

export default function SecretsSheet({ project, currentEnv = {}, onSave, onClose }) {
  const [values, setValues] = useState(currentEnv);
  const [showHelp, setShowHelp] = useState(null);
  const [rawCustom, setRawCustom] = useState(() =>
    Object.entries(currentEnv)
      .filter(([k]) => !ALL_PREDEFINED_KEYS.includes(k))
      .map(([k, v]) => `${k}=${v}`).join('\n')
  );
  const phase = project?.phase ?? 1;

  const visibleCategories = CATEGORIES.filter(c => c.minPhase <= phase);

  const save = () => {
    // Parse custom textarea and merge into values before saving
    const custom = {};
    rawCustom.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) custom[k] = v;
      }
    });
    const predefined = Object.fromEntries(
      Object.entries(values).filter(([k]) => ALL_PREDEFINED_KEYS.includes(k))
    );
    const merged = { ...predefined, ...custom };
    const filtered = Object.fromEntries(Object.entries(merged).filter(([, v]) => v?.trim()));
    onSave(filtered);
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1a1a1a', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Secrets</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.5 }}>
          Claude te guiará en el chat para obtener cada token. Aquí solo pégalos y confírmalos.
          {phase < 3 && ' Los secrets de GitHub y Netlify se activarán en Fase 3.'}
        </p>

        {/* Categorías visibles según fase */}
        {visibleCategories.map(cat => (
          <div key={cat.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e8490f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              {cat.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.vars.map(v => (
                <div key={v.key} style={{ background: '#2a2a2a', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{v.key}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {values[v.key]
                        ? <span style={{ fontSize: 10, color: '#86efac' }}>✓ configurado</span>
                        : <span style={{ fontSize: 10, color: '#666' }}>vacío</span>
                      }
                      <button
                        onClick={() => setShowHelp(showHelp === v.key ? null : v.key)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#aaa', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >?</button>
                    </div>
                  </div>
                  {showHelp === v.key && (
                    <p style={{ fontSize: 11, color: '#86efac', margin: '0 0 8px', lineHeight: 1.5 }}>{v.help}</p>
                  )}
                  <input
                    type="password"
                    placeholder={`Pega tu ${v.label.toLowerCase()} aquí`}
                    value={values[v.key] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Custom — siempre visible */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Custom</div>
          <textarea
            placeholder={'API_KEY=valor\nOTRA_VAR=valor'}
            value={rawCustom}
            onChange={e => setRawCustom(e.target.value)}
            style={{ width: '100%', background: '#2a2a2a', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 12, fontFamily: 'monospace', minHeight: 80, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={save}
          style={{ background: '#e8490f', border: 'none', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Guardar secrets
        </button>
      </div>
    </div>
  );
}
