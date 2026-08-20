'use client';
import React, { useState, useEffect } from 'react';

const TYPE_OPTIONS = ['conversation', 'reference', 'definition', 'process'];
const TYPE_LABELS  = { conversation: 'Conversación', reference: 'Referencia', definition: 'Definición', process: 'Proceso' };

export default function NodeEditor({ node, onClose, onSend, onTypeChange, onConnectStart }) {
  const [draft, setDraft] = useState(node?.content ?? '');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => { vv.removeEventListener('resize', handler); vv.removeEventListener('scroll', handler); };
  }, []);

  if (!node) return null;

  return (
    <div style={{
      position: 'fixed', bottom: keyboardOffset, left: 0, right: 0,
      background: '#141414', borderTop: '1px solid #2A2A2A',
      padding: 16, zIndex: 10,
      transition: 'bottom 150ms ease-out',
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {TYPE_OPTIONS.map(t => (
          <button key={t} onClick={() => onTypeChange(t)} aria-pressed={node.type === t}
            style={{
              padding: '6px 14px', minHeight: 36, borderRadius: 20, border: 'none', cursor: 'pointer',
              background: node.type === t ? '#f04e23' : '#2A2A2A',
              color: '#E0E0E0', fontSize: 12, fontWeight: 600,
            }}>
            {TYPE_LABELS[t]}
          </button>
        ))}
        {onConnectStart && (
          <button onClick={onConnectStart} aria-label="Conectar con otro nodo"
            style={{ padding: '6px 14px', minHeight: 36, borderRadius: 20, cursor: 'pointer',
                     background: 'transparent', border: '1.5px solid #2A2A2A',
                     color: '#888888', fontSize: 12, fontWeight: 600 }}>
            Conectar →
          </button>
        )}
        <button onClick={onClose} aria-label="Cerrar editor"
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#888888', cursor: 'pointer', fontSize: 20,
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, flexShrink: 0,
          }}>×</button>
      </div>

      {node.aiContent && (
        <div style={{
          background: '#0A0A0A', borderRadius: 8, padding: 10, marginBottom: 10,
          fontSize: 13, color: '#888888', maxHeight: 120, overflowY: 'auto',
        }}>
          {node.aiContent}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={node.type === 'conversation' ? 'Responde a la IA...' : 'Agregar contenido...'}
          rows={3}
          style={{
            flex: 1, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8,
            color: '#E0E0E0', padding: '8px 12px', fontSize: 14, resize: 'none',
          }}
        />
        <button onClick={() => onSend(draft)}
          style={{
            padding: '0 16px', background: '#f04e23', color: '#fff', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(240,78,35,0.35)',
          }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
