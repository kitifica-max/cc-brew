'use client';
import { useState } from 'react';
import { MODELS } from '../lib/storage';
import { supabase, clearSessionToken } from '../lib/supabase';

// Iconoir SVGs
const ICON_TRASH    = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m20 9l-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"/></svg>`;
const ICON_PLUS     = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M6 12h6m6 0h-6m0 0V6m0 6v6"/></svg>`;
const ICON_FOLDER   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M2 11V4.6a.6.6 0 0 1 .6-.6h6.178a.6.6 0 0 1 .39.144l3.164 2.712a.6.6 0 0 0 .39.144H21.4a.6.6 0 0 1 .6.6V11M2 11v8.4a.6.6 0 0 0 .6.6h18.8a.6.6 0 0 0 .6-.6V11M2 11h20"/></svg>`;
const ICON_PENCIL   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m14.363 5.652l1.48-1.48a2 2 0 0 1 2.829 0l1.414 1.414a2 2 0 0 1 0 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 0 0-.578 1.238l-.242 2.74a1 1 0 0 0 1.084 1.085l2.74-.242a2 2 0 0 0 1.24-.578l9.615-9.616m-4.243-4.242l4.243 4.242"/></svg>`;
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6"/><path d="m19.622 10.395l-1.097-2.65L20 6l-2-2l-1.735 1.483l-2.707-1.113L12.935 2h-1.954l-.632 2.401l-2.645 1.115L6 4L4 6l1.453 1.789l-1.08 2.657L2 11v2l2.401.656L5.516 16.3L4 18l2 2l1.791-1.46l2.606 1.072L11 22h2l.604-2.387l2.651-1.098C16.697 18.832 18 20 18 20l2-2l-1.484-1.75l1.098-2.652l2.386-.62V11z"/></svg>`;
const ICON_LOGOUT   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 12h7m0 0l-3 3m3-3l-3-3m3-3V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"/></svg>`;

const PHASES = [
  { n: 1, name: 'Ideación',          color: '#f04e23' },
  { n: 2, name: 'POC Local',         color: '#3b82f6' },
  { n: 3, name: 'Lanzamiento',       color: '#10b981' },
  { n: 4, name: 'Backend',           color: '#8b5cf6' },
  { n: 5, name: 'App Directa',       color: '#06b6d4' },
  { n: 6, name: 'Validación',        color: '#f59e0b' },
];

function PhaseTag({ phase }) {
  const p = PHASES[(phase ?? 1) - 1] ?? PHASES[0];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px',
      borderRadius: 20,
      background: p.color + '1f',
      border: `1px solid ${p.color}38`,
      marginBottom: 8,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: '0.01em' }}>
        Fase {p.n} · {p.name}
      </span>
    </div>
  );
}

function PhaseDots({ phase }) {
  const cur = phase ?? 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
      {PHASES.map(p => {
        const done = p.n < cur;
        const active = p.n === cur;
        const phaseColor = PHASES[cur - 1]?.color ?? '#f04e23';
        return (
          <div key={p.n} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: (done || active) ? phaseColor : 'rgba(0,0,0,0.12)',
            boxShadow: active ? `0 0 0 2.5px ${phaseColor}33` : 'none',
            flexShrink: 0,
          }} />
        );
      })}
      <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>
        {cur} / 6
      </span>
    </div>
  );
}

const ONBOARDING_STEPS = [
  {
    n: 1,
    title: 'Instala CC Creator en tu Mac',
    body: 'Abre Terminal y ejecuta:',
    code: 'brew install --cask kitifica-max/tap/cc-controller',
  },
  {
    n: 2,
    title: 'Crea tu primer proyecto',
    body: 'Toca "Nuevo proyecto" aquí. CC Creator crea la carpeta en tu Mac y escribe el CLAUDE.md de la Fase 1 automáticamente.',
  },
  {
    n: 3,
    title: 'Guía a Claude desde tu iPhone',
    body: 'Envía prompts, sube archivos y avanza de Fase cuando estés listo. Claude ya sabe exactamente en qué etapa va tu proyecto.',
  },
];

const CC_LOGO = (
  <svg width="52" height="52" viewBox="0 0 459.9 459.9" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#333" width="459.9" height="459.9" rx="60.8" ry="60.8"/>
    <path fill="#ff582a" d="M350.7,202.2h0c-9.7,0-18.4,5.9-22.3,14.8-2.7,6.2-6.7,11.8-11.8,17-10.7,10.7-23.5,16.2-38.4,16.6-.5,0-1,0-1.6,0-15.6,0-28.9-5.5-39.9-16.5-1.3-1.3-2.4-2.6-3.6-3.9-8.6-10.2-13-22.2-13-36s4.3-25.8,13-36.1c-1.1-1.3-2.3-2.6-3.6-3.9-11.1-10.9-24.4-16.4-39.9-16.4s-1.1,0-1.6,0c-10.8,16.6-16.3,35.3-16.3,56.4s5.4,39.8,16.3,56.4c4.1,6.2,8.9,12.1,14.4,17.7,9.3,9.3,19.5,16.5,30.6,21.6,13.2,6.1,27.7,9.1,43.5,9.1,28.9,0,53.6-10.3,74.1-30.8s17.1-20.3,22.1-31.9c7-16-4.7-34-22.2-34h0Z"/>
    <path fill="#ff582a" d="M278.2,137.7c14.9.4,27.7,5.8,38.4,16.4,5.2,5.2,9.1,10.9,11.8,17.1,3.9,8.9,12.6,14.8,22.3,14.8h0c17.5,0,29.2-18,22.2-34-5.1-11.6-12.5-22.3-22.2-32.1-20.5-20.4-45.2-30.6-74.1-30.6s-30.2,3.1-43.4,9.1c11.1,5.1,21.3,12.2,30.6,21.5,5.6,5.6,10.4,11.5,14.4,17.8h0Z"/>
    <path fill="#ff9477" d="M263.8,202.2c-9.7,0-18.4,5.9-22.3,14.8-2.1,4.7-4.9,9.1-8.3,13.2,1.1,1.3,2.3,2.6,3.6,3.9,11,11,24.3,16.5,39.9,16.5s1,0,1.6,0c3-4.6,5.6-9.4,7.8-14.3,7-16-4.7-34-22.2-34h0Z"/>
    <path fill="#ff9477" d="M188.1,250.5c-14.9-.4-27.7-5.8-38.3-16.5-11-11-16.5-24.3-16.5-39.9s5.5-28.9,16.5-39.9,23.9-16.1,38.3-16.5c.5,0,1.1,0,1.6,0,15.6,0,28.9,5.5,39.9,16.4,1.3,1.3,2.4,2.6,3.6,3.9,3.4,4.1,6.2,8.5,8.3,13.2,3.9,8.9,12.6,14.8,22.3,14.8h0c17.5,0,29.2-18,22.2-34-2.2-4.9-4.8-9.7-7.8-14.3-4-6.2-8.8-12.2-14.4-17.8-9.3-9.3-19.6-16.4-30.6-21.5-13.3-6.1-27.8-9.1-43.5-9.1-28.9,0-53.6,10.2-74.1,30.7-20.5,20.5-30.7,45.2-30.7,74.1s10.2,53.6,30.7,74.1c20.5,20.5,45.2,30.7,74.1,30.7s30.2-3.1,43.4-9.1c-11.1-5.1-21.3-12.2-30.6-21.6-5.6-5.6-10.4-11.5-14.4-17.7h0Z"/>
  </svg>
);

export default function ProjectsList({ projects, currentId, awaitingFolder, onSwitch, onDelete, onCreate, onRename, onOpenFolder, onCancelFolder, onBack, onShowSettings }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('cc-onboarding-done');
  });

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setCreating(false);
  }

  function startEdit(e, id, name) {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name);
    setConfirmId(null);
  }

  function commitEdit(id) {
    const trimmed = editName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  function dismissOnboarding() {
    localStorage.setItem('cc-onboarding-done', '1');
    setShowOnboarding(false);
  }

  if (showOnboarding) return (
    <main style={{ height: '100dvh', background: '#f0f0f2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#f04e23', padding: '52px 24px 28px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {CC_LOGO}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Bienvenido a CC Creator</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 1.4 }}>De la idea a tu App Directa en 6 fases,<br/>desde tu iPhone.</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 18 }}>Primeros pasos</div>
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 14, marginBottom: i < ONBOARDING_STEPS.length - 1 ? 24 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f04e23', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>{s.n}</div>
                {i < ONBOARDING_STEPS.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(240,78,35,0.18)', marginTop: 6 }} />}
              </div>
              <div style={{ paddingBottom: i < ONBOARDING_STEPS.length - 1 ? 8 : 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5, marginBottom: s.code ? 8 : 0 }}>{s.body}</div>
                {s.code && (
                  <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: '#e8e8e8', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {s.code}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 14px 40px', flexShrink: 0 }}>
        <button
          onClick={dismissOnboarding}
          style={{ width: '100%', background: '#f04e23', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(240,78,35,0.35)', letterSpacing: '-0.01em' }}
        >
          Empezar →
        </button>
      </div>
    </main>
  );

  if (awaitingFolder) return (
    <main style={{ height: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 0 }}>
      <div style={{ fontSize: 52, marginBottom: 24 }}>🖥️</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 12 }}>
        Selecciona una carpeta en tu Mac
      </div>
      <div style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 8 }}>
        Haz clic en el ícono de CC Creator en la barra de menús de tu Mac.
      </div>
      <div style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 36 }}>
        Selecciona <strong style={{ color: '#1a1a1a' }}>📁 Seleccionar carpeta del proyecto</strong> — la app navegará al chat automáticamente.
      </div>
      <div style={{ width: 40, height: 40, border: '3px solid #f04e23', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 40 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={onCancelFolder}
        style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '12px 28px', fontSize: 14, fontWeight: 600, color: '#666', cursor: 'pointer' }}
      >
        Cancelar
      </button>
    </main>
  );

  const activeProject = projects.find(p => p.id === currentId);
  const others = projects.filter(p => p.id !== currentId);

  return (
    <main style={{ height: '100dvh', background: '#f0f0f2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 18px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {/* CC Creator logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="34" height="34" viewBox="0 0 459.9 459.9" xmlns="http://www.w3.org/2000/svg">
              <rect fill="#333" width="459.9" height="459.9" rx="60.8" ry="60.8"/>
              <path fill="#ff582a" d="M350.7,202.2h0c-9.7,0-18.4,5.9-22.3,14.8-2.7,6.2-6.7,11.8-11.8,17-10.7,10.7-23.5,16.2-38.4,16.6-.5,0-1,0-1.6,0-15.6,0-28.9-5.5-39.9-16.5-1.3-1.3-2.4-2.6-3.6-3.9-8.6-10.2-13-22.2-13-36s4.3-25.8,13-36.1c-1.1-1.3-2.3-2.6-3.6-3.9-11.1-10.9-24.4-16.4-39.9-16.4s-1.1,0-1.6,0c-10.8,16.6-16.3,35.3-16.3,56.4s5.4,39.8,16.3,56.4c4.1,6.2,8.9,12.1,14.4,17.7,9.3,9.3,19.5,16.5,30.6,21.6,13.2,6.1,27.7,9.1,43.5,9.1,28.9,0,53.6-10.3,74.1-30.8s17.1-20.3,22.1-31.9c7-16-4.7-34-22.2-34h0Z"/>
              <path fill="#ff582a" d="M278.2,137.7c14.9.4,27.7,5.8,38.4,16.4,5.2,5.2,9.1,10.9,11.8,17.1,3.9,8.9,12.6,14.8,22.3,14.8h0c17.5,0,29.2-18,22.2-34-5.1-11.6-12.5-22.3-22.2-32.1-20.5-20.4-45.2-30.6-74.1-30.6s-30.2,3.1-43.4,9.1c11.1,5.1,21.3,12.2,30.6,21.5,5.6,5.6,10.4,11.5,14.4,17.8h0Z"/>
              <path fill="#ff9477" d="M263.8,202.2c-9.7,0-18.4,5.9-22.3,14.8-2.1,4.7-4.9,9.1-8.3,13.2,1.1,1.3,2.3,2.6,3.6,3.9,11,11,24.3,16.5,39.9,16.5s1,0,1.6,0c3-4.6,5.6-9.4,7.8-14.3,7-16-4.7-34-22.2-34h0Z"/>
              <path fill="#ff9477" d="M188.1,250.5c-14.9-.4-27.7-5.8-38.3-16.5-11-11-16.5-24.3-16.5-39.9s5.5-28.9,16.5-39.9,23.9-16.1,38.3-16.5c.5,0,1.1,0,1.6,0,15.6,0,28.9,5.5,39.9,16.4,1.3,1.3,2.4,2.6,3.6,3.9,3.4,4.1,6.2,8.5,8.3,13.2,3.9,8.9,12.6,14.8,22.3,14.8h0c17.5,0,29.2-18,22.2-34-2.2-4.9-4.8-9.7-7.8-14.3-4-6.2-8.8-12.2-14.4-17.8-9.3-9.3-19.6-16.4-30.6-21.5-13.3-6.1-27.8-9.1-43.5-9.1-28.9,0-53.6,10.2-74.1,30.7-20.5,20.5-30.7,45.2-30.7,74.1s10.2,53.6,30.7,74.1c20.5,20.5,45.2,30.7,74.1,30.7s30.2-3.1,43.4-9.1c-11.1-5.1-21.3-12.2-30.6-21.6-5.6-5.6-10.4-11.5-14.4-17.7h0Z"/>
              <path fill="#fff" d="M145.2,361.4c-2.2,10.1-9.8,17.5-23.4,17.5s-25.3-12.2-25.3-27.6,8.4-28.2,25.9-28.2,21.5,8.5,22.8,17.6h-11.7c-1.1-4.2-4-8.4-11.4-8.4s-13.4,8.7-13.4,18.6,3.2,18.8,13.7,18.8,10.1-5.1,11.1-8.3h11.8Z"/>
              <path fill="#fff" d="M152.6,348.5c0-4,0-7.6,0-11.1h11.1c.1.9.3,5,.3,7.2,1.8-4.7,6.1-8.1,13.1-8.1v10.8c-8.2-.2-13.1,2-13.1,13.2v17.8h-11.3v-29.7Z"/>
              <path fill="#fff" d="M191.9,360.2c0,5.1,2.6,10.1,8.2,10.1s6-1.9,7.1-4.3h11.3c-1.4,5-5.9,13.2-18.7,13.2s-19.2-10-19.2-20.7,6.6-21.9,19.6-21.9,18.7,10.1,18.7,20.3,0,2.3-.1,3.4h-26.9ZM207.6,353.3c0-4.7-2-8.7-7.5-8.7s-7.6,3.7-8,8.7h15.5Z"/>
              <path fill="#fff" d="M260.4,367.6c0,3.9.3,9.5.6,10.5h-10.8c-.3-.8-.6-3-.6-4-1.5,2.3-4.2,4.9-11.5,4.9s-14-6.5-14-12.8c0-9.3,7.5-13.6,19.4-13.6h5.8v-2.5c0-2.9-1-5.7-6.3-5.7s-5.8,2-6.3,5h-10.7c.6-7.2,5.1-13.1,17.5-13,10.9,0,16.8,4.3,16.8,14v17.1ZM249.4,359.6h-4.6c-6.8,0-9.3,2.1-9.3,6s1.8,5.4,5.9,5.4c7.2,0,8-5,8-10.4v-1.1Z"/>
              <path fill="#fff" d="M265.9,337.4h6.3v-11h11.3v11h8v8.5h-8v20.1c0,3.1.9,4.3,4.3,4.3s1.7,0,2.6-.1v7.8c-2.2.8-5.3.8-7.6.8-7.9,0-10.6-4.3-10.6-11.4v-21.4h-6.3v-8.5Z"/>
              <path fill="#fff" d="M335.5,357.7c0,12.3-7.4,21.4-20.3,21.4s-20-9-20-21.2,7.6-21.5,20.5-21.5,19.8,8.5,19.8,21.2ZM306.7,357.8c0,7.8,3.4,12.5,8.8,12.5s8.6-4.6,8.6-12.4-3.1-12.6-8.7-12.6-8.7,3.9-8.7,12.5Z"/>
              <path fill="#fff" d="M343.3,348.5c0-4,0-7.6,0-11.1h11.1c.1.9.3,5,.3,7.2,1.8-4.7,6.1-8.1,13.1-8.1v10.8c-8.2-.2-13.1,2-13.1,13.2v17.8h-11.3v-29.7Z"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <button
              onClick={onShowSettings}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              dangerouslySetInnerHTML={{ __html: ICON_SETTINGS }}
            />
            <button
              onClick={async () => {
                clearSessionToken();
                localStorage.removeItem('cc-session-id');
                await supabase.auth.signOut();
              }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              dangerouslySetInnerHTML={{ __html: ICON_LOGOUT }}
            />
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>Proyectos</div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Active project */}
        {activeProject && (() => {
          const p = activeProject;
          const modelLabel = MODELS.find(m => m.id === p.model)?.label ?? p.model;
          const isEditing = editingId === p.id;
          return (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', padding: '0 2px' }}>Activo</div>
              <div
                key={p.id}
                onClick={() => { if (!isEditing) onSwitch(p.id); }}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  padding: '13px 13px 13px 15px',
                  cursor: isEditing ? 'default' : 'pointer',
                  border: '1.5px solid rgba(240,78,35,0.32)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07), 0 0 0 1px rgba(240,78,35,0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(p.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => commitEdit(p.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, color: '#1a1a1a', outline: 'none' }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  )}
                  {!isEditing && (
                    <>
                      <button onClick={e => startEdit(e, p.id, p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: '#ccc', borderRadius: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: ICON_PENCIL }} />
                      {confirmId === p.id ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); onDelete(p.id); setConfirmId(null); }} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Sí</button>
                          <button onClick={e => { e.stopPropagation(); setConfirmId(null); }} style={{ background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer' }}>No</button>
                        </>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmId(p.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: '#ccc', borderRadius: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: ICON_TRASH }} />
                      )}
                    </>
                  )}
                </div>
                <PhaseTag phase={p.phase} />
                <PhaseDots phase={p.phase} />
                <div style={{ fontSize: 11, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                  {modelLabel} · {p.effort} · {p.messages.length} msgs · {new Date(p.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Other projects */}
        {others.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', padding: '2px 2px 0', marginTop: activeProject ? 2 : 0 }}>Recientes</div>
        )}
        {/* Empty state */}
        {projects.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ccc', marginBottom: 16 }}>Cómo empezar</div>
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: i < ONBOARDING_STEPS.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(240,78,35,0.1)', border: '1.5px solid rgba(240,78,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#f04e23' }}>{s.n}</div>
                  {i < ONBOARDING_STEPS.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(240,78,35,0.12)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: i < ONBOARDING_STEPS.length - 1 ? 4 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5, marginBottom: s.code ? 6 : 0 }}>{s.body}</div>
                  {s.code && (
                    <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '6px 10px', fontSize: 10, fontFamily: 'monospace', color: '#e8e8e8', wordBreak: 'break-all', lineHeight: 1.5 }}>{s.code}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {others.map(p => {
          const modelLabel = MODELS.find(m => m.id === p.model)?.label ?? p.model;
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => { if (!isEditing) onSwitch(p.id); }}
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: '13px 13px 13px 15px',
                cursor: isEditing ? 'default' : 'pointer',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(p.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => commitEdit(p.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, color: '#1a1a1a', outline: 'none' }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                )}
                {!isEditing && (
                  <>
                    <button onClick={e => startEdit(e, p.id, p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: '#ccc', borderRadius: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: ICON_PENCIL }} />
                    {confirmId === p.id ? (
                      <>
                        <button onClick={e => { e.stopPropagation(); onDelete(p.id); setConfirmId(null); }} style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Sí</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmId(null); }} style={{ background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer' }}>No</button>
                      </>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setConfirmId(p.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, color: '#ccc', borderRadius: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: ICON_TRASH }} />
                    )}
                  </>
                )}
              </div>
              <PhaseTag phase={p.phase} />
              <PhaseDots phase={p.phase} />
              <div style={{ fontSize: 11, color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
                {modelLabel} · {p.effort} · {p.messages.length} msgs · {new Date(p.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '12px 14px 36px', flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)', background: '#f0f0f2' }}>
        {creating ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Nombre del proyecto..."
              style={{ flex: 1, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '12px 16px', fontSize: 15, fontWeight: 500, color: '#1a1a1a', outline: 'none' }}
            />
            <button
              onClick={handleCreate}
              style={{ background: '#f04e23', border: 'none', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Crear
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setCreating(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f04e23', border: 'none', borderRadius: 16, padding: '15px 16px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(240,78,35,0.35)', letterSpacing: '-0.01em' }}
            >
              <span style={{ display: 'flex', width: 17, height: 17 }} dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
              Nuevo proyecto
            </button>
            <button
              onClick={onOpenFolder}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'none', border: '1px solid rgba(0,0,0,0.13)', borderRadius: 16, padding: '13px 16px', fontSize: 14, fontWeight: 600, color: '#666', cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', width: 16, height: 16 }} dangerouslySetInnerHTML={{ __html: ICON_FOLDER }} />
              Abrir carpeta existente
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
