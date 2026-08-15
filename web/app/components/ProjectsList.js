'use client';
import { useState } from 'react';
import { MODELS } from '../lib/storage';
import { supabase, clearSessionToken } from '../lib/supabase';

// Iconoir SVGs
const ICON_TRASH    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m20 9l-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"/></svg>`;
const ICON_PLUS     = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M6 12h6m6 0h-6m0 0V6m0 6v6"/></svg>`;
const ICON_FOLDER   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M2 11V4.6a.6.6 0 0 1 .6-.6h6.178a.6.6 0 0 1 .39.144l3.164 2.712a.6.6 0 0 0 .39.144H21.4a.6.6 0 0 1 .6.6V11M2 11v8.4a.6.6 0 0 0 .6.6h18.8a.6.6 0 0 0 .6-.6V11M2 11h20"/></svg>`;
const ICON_PENCIL   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m14.363 5.652l1.48-1.48a2 2 0 0 1 2.829 0l1.414 1.414a2 2 0 0 1 0 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 0 0-.578 1.238l-.242 2.74a1 1 0 0 0 1.084 1.085l2.74-.242a2 2 0 0 0 1.24-.578l9.615-9.616m-4.243-4.242l4.243 4.242"/></svg>`;
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6"/><path d="m19.622 10.395l-1.097-2.65L20 6l-2-2l-1.735 1.483l-2.707-1.113L12.935 2h-1.954l-.632 2.401l-2.645 1.115L6 4L4 6l1.453 1.789l-1.08 2.657L2 11v2l2.401.656L5.516 16.3L4 18l2 2l1.791-1.46l2.606 1.072L11 22h2l.604-2.387l2.651-1.098C16.697 18.832 18 20 18 20l2-2l-1.484-1.75l1.098-2.652l2.386-.62V11z"/></svg>`;
const ICON_LOGOUT   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 12h7m0 0l-3 3m3-3l-3-3m3-3V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"/></svg>`;

const PHASES = [
  { n: 1, name: 'Ideación',          color: '#f97316' },
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
        const phaseColor = PHASES[cur - 1]?.color ?? '#f97316';
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

export default function ProjectsList({ projects, currentId, awaitingFolder, onSwitch, onDelete, onCreate, onRename, onOpenFolder, onCancelFolder, onBack, onShowSettings, trialPill }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

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
      <div style={{ width: 40, height: 40, border: '3px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 40 }} />
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
      <div style={{ background: '#f97316', padding: '52px 18px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {/* CC Creator logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 302 302" xmlns="http://www.w3.org/2000/svg">
                <path fill="#fff" d="M242.73,157.22h0c-7.37,0-13.92,4.45-16.91,11.19-2.08,4.69-5.07,8.99-8.99,12.9-8.11,8.11-17.83,12.29-29.14,12.57-.4,0-.79.03-1.19.03-11.82,0-21.91-4.18-30.26-12.53-.96-.96-1.86-1.94-2.7-2.95-6.55-7.75-9.83-16.85-9.83-27.32s3.29-19.6,9.87-27.36c-.84-1.01-1.74-2-2.7-2.96-8.39-8.31-18.5-12.47-30.31-12.47-.4,0-.8.02-1.2.03-8.22,12.57-12.35,26.82-12.35,42.77,0,15.96,4.13,30.21,12.35,42.77,3.08,4.71,6.71,9.18,10.94,13.42,7.07,7.07,14.81,12.51,23.2,16.36,10.05,4.61,21.04,6.93,32.99,6.93,21.93,0,40.68-7.78,56.25-23.36,7.34-7.34,12.94-15.42,16.8-24.22,5.33-12.16-3.55-25.8-16.83-25.8Z"/>
                <path fill="rgba(255,255,255,0.55)" d="M119.38,193.88c-11.31-.27-21.01-4.43-29.08-12.51-8.36-8.35-12.53-18.44-12.53-30.26s4.18-21.91,12.53-30.26c7.74-7.74,18.17-12.2,29.08-12.51,11.81,0,21.91,4.16,30.31,12.47.95.97,1.85,1.95,2.7,2.96,2.62,3.13,4.72,6.48,6.29,10.03,2.98,6.75,9.54,11.21,16.92,11.21h0c13.27,0,22.14-13.62,16.83-25.78-1.64-3.76-3.62-7.38-5.89-10.87-3.07-4.73-6.7-9.23-10.93-13.48-7.09-7.05-14.84-12.48-23.25-16.32-10.06-4.6-21.06-6.92-33-6.92-21.93,0-40.66,7.76-56.19,23.29-15.53,15.53-23.3,34.26-23.3,56.19s7.76,40.66,23.3,56.19c15.53,15.53,34.26,23.3,56.19,23.3,11.93,0,22.91-2.32,32.96-6.93-8.39-3.85-16.13-9.29-23.2-16.36-4.23-4.23-7.87-8.71-10.94-13.42Z"/>
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' }}>CC Creator</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {trialPill}
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
                  border: '1.5px solid rgba(249,115,22,0.32)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07), 0 0 0 1px rgba(249,115,22,0.15)',
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
              style={{ background: '#f97316', border: 'none', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Crear
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setCreating(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f97316', border: 'none', borderRadius: 16, padding: '15px 16px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(249,115,22,0.35)', letterSpacing: '-0.01em' }}
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
