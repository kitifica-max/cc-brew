'use client';
import { useState } from 'react';

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function fmtRelative(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function StatusTag({ p }) {
  if (p.claudeMd) return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', flexShrink: 0 }}>CLAUDE.md ✓</span>
  );
  if (p.ideaText || p.sessionId || p.pendingQuestions) return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', flexShrink: 0 }}>En proceso</span>
  );
  return null;
}

// Iconoir SVGs
const ICON_TRASH    = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m20 9l-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"/></svg>`;
const ICON_PLUS     = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M6 12h6m6 0h-6m0 0V6m0 6v6"/></svg>`;
const ICON_FOLDER   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M2 11V4.6a.6.6 0 0 1 .6-.6h6.178a.6.6 0 0 1 .39.144l3.164 2.712a.6.6 0 0 0 .39.144H21.4a.6.6 0 0 1 .6.6V11M2 11v8.4a.6.6 0 0 0 .6.6h18.8a.6.6 0 0 0 .6-.6V11M2 11h20"/></svg>`;
const ICON_PENCIL   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m14.363 5.652l1.48-1.48a2 2 0 0 1 2.829 0l1.414 1.414a2 2 0 0 1 0 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 0 0-.578 1.238l-.242 2.74a1 1 0 0 0 1.084 1.085l2.74-.242a2 2 0 0 0 1.24-.578l9.615-9.616m-4.243-4.242l4.243 4.242"/></svg>`;
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6"/><path d="m19.622 10.395l-1.097-2.65L20 6l-2-2l-1.735 1.483l-2.707-1.113L12.935 2h-1.954l-.632 2.401l-2.645 1.115L6 4L4 6l1.453 1.789l-1.08 2.657L2 11v2l2.401.656L5.516 16.3L4 18l2 2l1.791-1.46l2.606 1.072L11 22h2l.604-2.387l2.651-1.098C16.697 18.832 18 20 18 20l2-2l-1.484-1.75l1.098-2.652l2.386-.62V11z"/></svg>`;
const ICON_REFRESH   = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M3 12a9 9 0 0 0 15.36 6.36L21 16M21 8V3m0 5h-5M21 16v5m0-5h-5"/></svg>`;

const ONBOARDING_STEPS = [
  {
    n: 1,
    title: 'Instala el MCP',
    body: 'Ve a Ajustes (⚙️), copia el prompt de instalación y pégalo en Claude Code. Solo una vez.',
  },
  {
    n: 2,
    title: 'Captura tu idea',
    body: 'Toca "Nuevo proyecto". Descríbela como si se la explicaras a un amigo — en texto o por voz.',
  },
  {
    n: 3,
    title: 'Obtén tu CLAUDE.md',
    body: 'Responde las preguntas, revisa el semáforo de viabilidad y descarga el CLAUDE.md listo para construir.',
  },
];

export default function ProjectsList({ projects, currentId, onSwitch, onDelete, onCreate, onRename, onShowSettings, onRefresh, refreshing }) {
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

  const activeProject = projects.find(p => p.id === currentId);
  const others = projects.filter(p => p.id !== currentId);

  return (
    <main style={{ height: '100dvh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Textura de cuadrícula — llena el fondo vacío del estado sin proyectos */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%)',
      }} />

      {/* Header */}
      <div style={{ background: '#7c3aed', padding: '52px 18px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {/* CC Brew logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="34" height="34" viewBox="0 0 431.63 431.63" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#ccc" width="431.63" height="431.63" rx="63.18" ry="63.18"/>
      <path fill="#0d0c0f" d="M149.06,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M252.81,121.13c-48.13,4.73-85.73,45.31-85.73,94.68,0,49.37,37.6,89.96,85.73,94.68,5.05.5,9.42-3.51,9.42-8.58v-172.21c0-5.07-4.37-9.08-9.42-8.58Z"/>
      <path fill="#0d0c0f" d="M337.9,215.79c17.85-7.43,30.39-25.03,30.39-45.57,0-25.6-19.5-46.65-44.45-49.1v-.02h-43.64c-4.05,0-7.34,3.28-7.34,7.34v174.72c0,4.05,3.28,7.34,7.34,7.34h42.82c.27.02.54.03.82,0,24.96-2.45,44.47-23.51,44.47-49.11,0-20.55-12.56-38.16-30.41-45.58Z"/>
    </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                title="Actualizar estado desde el servidor"
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: refreshing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: refreshing ? 0.6 : 1 }}
              >
                <span style={{ display: 'flex', animation: refreshing ? 'pl-spin 0.7s linear infinite' : 'none' }} dangerouslySetInnerHTML={{ __html: ICON_REFRESH }} />
              </button>
            )}
            <button
              onClick={onShowSettings}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              dangerouslySetInnerHTML={{ __html: ICON_SETTINGS }}
            />
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>Proyectos</div>
      </div>
      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Active project */}
        {activeProject && (() => {
          const p = activeProject;
          const isEditing = editingId === p.id;
          return (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', padding: '0 2px' }}>Activo</div>
              <div
                key={p.id}
                onClick={() => { if (!isEditing) onSwitch(p.id); }}
                style={{
                  background: '#141414',
                  borderRadius: 18,
                  padding: '13px 13px 13px 15px',
                  cursor: isEditing ? 'default' : 'pointer',
                  border: '1.5px solid rgba(124,58,237,0.32)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.07), 0 0 0 1px rgba(124,58,237,0.15)',
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
                      style={{ flex: 1, background: '#1A1A1A', border: '1.5px solid #2A2A2A', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, color: '#E0E0E0', outline: 'none' }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#E0E0E0', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusTag p={p} />
                  <span style={{ fontSize: 11, color: '#525252', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDate(p.createdAt)}{p.updatedAt ? ` · ${fmtRelative(p.updatedAt)}` : ''}
                  </span>
                </div>
              </div>
            </>
          );
        })()}

        {/* Other projects */}
        {others.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', padding: '2px 2px 0', marginTop: activeProject ? 2 : 0 }}>Recientes</div>
        )}
        {/* Empty state */}
        {projects.length === 0 && (
          <div style={{ background: '#141414', borderRadius: 18, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#525252', marginBottom: 16 }}>Cómo empezar</div>
            {ONBOARDING_STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: i < ONBOARDING_STEPS.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1.5px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#7c3aed' }}>{s.n}</div>
                  {i < ONBOARDING_STEPS.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(124,58,237,0.12)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: i < ONBOARDING_STEPS.length - 1 ? 4 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#525252', lineHeight: 1.5, marginBottom: s.code ? 6 : 0 }}>{s.body}</div>
                  {s.code && (
                    <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '6px 10px', fontSize: 10, fontFamily: 'monospace', color: '#e8e8e8', wordBreak: 'break-all', lineHeight: 1.5 }}>{s.code}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {others.map(p => {
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => { if (!isEditing) onSwitch(p.id); }}
              style={{
                background: '#141414',
                borderRadius: 18,
                padding: '13px 13px 13px 15px',
                cursor: isEditing ? 'default' : 'pointer',
                border: '1px solid rgba(255,255,255,0.08)',
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
                    style={{ flex: 1, background: '#1A1A1A', border: '1.5px solid #2A2A2A', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, color: '#E0E0E0', outline: 'none' }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#E0E0E0', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusTag p={p} />
                <span style={{ fontSize: 11, color: '#525252', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDate(p.createdAt)}{p.updatedAt ? ` · ${fmtRelative(p.updatedAt)}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '12px 14px 36px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0A' }}>
        {creating ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Nombre del proyecto..."
              style={{ flex: 1, background: '#141414', border: '1.5px solid #2A2A2A', borderRadius: 14, padding: '12px 16px', fontSize: 15, fontWeight: 500, color: '#E0E0E0', outline: 'none' }}
            />
            <button
              onClick={handleCreate}
              style={{ background: '#7c3aed', border: 'none', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              Crear
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setCreating(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#7c3aed', border: 'none', borderRadius: 16, padding: '15px 16px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(124,58,237,0.35)', letterSpacing: '-0.01em' }}
            >
              <span style={{ display: 'flex', width: 17, height: 17 }} dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
              Nuevo proyecto
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
