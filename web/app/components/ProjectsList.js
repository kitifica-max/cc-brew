'use client';
import { useState } from 'react';
import { MODELS } from '../lib/storage';

const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7v14"/></svg>`;
const ICON_FOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
const ICON_PENCIL = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

export default function ProjectsList({ projects, currentId, awaitingFolder, onSwitch, onDelete, onCreate, onRename, onOpenFolder, onCancelFolder, onBack }) {
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
        Haz clic en el ícono de CC Controller en la barra de menús de tu Mac.
      </div>
      <div style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 36 }}>
        Selecciona <strong style={{ color: '#1a1a1a' }}>📁 Seleccionar carpeta del proyecto</strong> — la app navegará al chat automáticamente.
      </div>
      <div style={{ width: 40, height: 40, border: '3px solid #f04e23', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 40 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={onCancelFolder}
        style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: '12px 28px', fontSize: 14, fontWeight: 600, color: '#666', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
      >
        Cancelar
      </button>
    </main>
  );

  return (
    <main style={{ height: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          Claude Code
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Proyectos</div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map(p => {
          const modelLabel = MODELS.find(m => m.id === p.model)?.label ?? p.model;
          const isActive = p.id === currentId;
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => { if (!isEditing) onSwitch(p.id); }}
              style={{ background: isActive ? '#f04e23' : '#fff', borderRadius: 16, padding: '14px 52px 14px 16px', cursor: isEditing ? 'default' : 'pointer', position: 'relative' }}
            >
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
                  style={{ width: '100%', background: isActive ? 'rgba(255,255,255,0.2)' : '#f5f5f5', border: isActive ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid #e0e0e0', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none', marginBottom: 3 }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : '#1a1a1a' }}>{p.name}</span>
                  <button
                    onClick={e => startEdit(e, p.id, p.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: isActive ? 'rgba(255,255,255,0.5)' : '#ccc', flexShrink: 0, lineHeight: 1 }}
                    dangerouslySetInnerHTML={{ __html: ICON_PENCIL }}
                  />
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'rgba(255,255,255,0.65)' : '#999999' }}>
                {modelLabel} · {p.effort} · {p.messages.length} msgs · {new Date(p.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </div>
              {!isEditing && (confirmId === p.id ? (
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
              ))}
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
