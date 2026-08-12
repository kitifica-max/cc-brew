'use client';
import { useState } from 'react';
import { MODELS } from '../lib/storage';

const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 19l-7-7l7-7m7 7H5"/></svg>`;
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7v14"/></svg>`;
const ICON_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

export default function ProjectsList({ projects, currentId, onSwitch, onDelete, onCreate, onOpenFolder, onBack }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setCreating(false);
  }

  return (
    <main style={{ height: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              Claude Code
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Proyectos</div>
          </div>
          <button
            onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', width: 14, height: 14, color: '#fff' }} dangerouslySetInnerHTML={{ __html: ICON_BACK }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Volver</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map(p => {
          const modelLabel = MODELS.find(m => m.id === p.model)?.label ?? p.model;
          const isActive = p.id === currentId;
          return (
            <div
              key={p.id}
              onClick={() => onSwitch(p.id)}
              style={{ background: isActive ? '#f04e23' : '#fff', borderRadius: 16, padding: '14px 44px 14px 16px', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : '#1a1a1a', marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'rgba(255,255,255,0.65)' : '#999999' }}>
                {modelLabel} · {p.effort} · {p.messages.length} msgs · {new Date(p.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </div>
              {confirmId === p.id ? (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(p.id); setConfirmId(null); }}
                    style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                  >Sí</button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(null); }}
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : '#555', cursor: 'pointer' }}
                  >No</button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmId(p.id); }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: isActive ? 'rgba(255,255,255,0.5)' : '#ccc' }}
                  dangerouslySetInnerHTML={{ __html: ICON_TRASH }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Create project */}
      <div style={{ padding: '12px 14px 36px', flexShrink: 0 }}>
        {creating ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Nombre del proyecto..."
              style={{ flex: 1, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '12px 16px', fontSize: 15, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' }}
            />
            <button
              onClick={handleCreate}
              style={{ background: '#f04e23', border: 'none', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              Crear
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => setCreating(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1a1a1a', border: 'none', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              <span style={{ display: 'flex', width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
              Nuevo proyecto
            </button>
            <button
              onClick={onOpenFolder}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              <span style={{ display: 'flex', width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: ICON_FOLDER }} />
              Abrir carpeta existente
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
