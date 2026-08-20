'use client';
import React, { useState } from 'react';

const TYPE_OPTIONS = ['conversation', 'reference', 'definition', 'process'];
const TYPE_LABELS  = { conversation: 'Conversación', reference: 'Referencia', definition: 'Definición', process: 'Proceso' };

export default function NodeEditor({ node, onClose, onSend, onTypeChange }) {
  const [draft, setDraft] = useState(node?.content ?? '');
  if (!node) return null;

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: '#1E293B', borderTop: '1px solid #334155',
                  padding: 16, zIndex: 10 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {TYPE_OPTIONS.map(t => (
          <button key={t} onClick={() => onTypeChange(t)}
            style={{ padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                     background: node.type === t ? '#6366F1' : '#334155', color: '#E2E8F0', fontSize: 12 }}>
            {TYPE_LABELS[t]}
          </button>
        ))}
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none',
                                           color: '#94A3B8', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>

      {node.aiContent && (
        <div style={{ background: '#0F172A', borderRadius: 8, padding: 10, marginBottom: 10,
                      fontSize: 13, color: '#94A3B8', maxHeight: 120, overflowY: 'auto' }}>
          {node.aiContent}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={node.type === 'conversation' ? 'Responde a la IA...' : 'Agregar contenido...'}
          rows={3}
          style={{ flex: 1, background: '#0F172A', border: '1px solid #334155', borderRadius: 8,
                   color: '#E2E8F0', padding: '8px 12px', fontSize: 14, resize: 'none' }}
        />
        <button onClick={() => onSend(draft)}
          style={{ padding: '0 16px', background: '#6366F1', color: '#fff', border: 'none',
                   borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
