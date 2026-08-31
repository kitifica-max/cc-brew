'use client';
import { useState } from 'react';
import { useIsDesktop } from '../lib/useIsDesktop';
import BrewSpinner from './BrewSpinner';
import { FlowFooter } from './FlowChrome';

export default function DocumentViewer({ claudeMd, projectName, nodes, onOpenCanvas, onNew, onClose, saveStatus, onRetrySave }) {
  const isDesktop = useIsDesktop();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(claudeMd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    const file = new File([claudeMd], 'CLAUDE.md', { type: 'text/plain' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `CLAUDE.md — ${projectName}`,
          files: [file],
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {}
    }
    // Fallback: download
    const url = URL.createObjectURL(new Blob([claudeMd], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CLAUDE.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'center' : 'stretch',
      padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)',
    }}>
    <div style={{ width: '100%', maxWidth: isDesktop ? 760 : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Cerrar proyecto"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                   justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>CLAUDE.md generado</div>
          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <BrewSpinner size={12} />
              <span style={{ fontSize: 10, color: '#888888' }}>Guardando...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div style={{ fontSize: 10, color: '#10B981', marginTop: 1 }}>✓ Guardado — listo para usar con Claude Code</div>
          )}
          {saveStatus === 'error' && (
            <button onClick={onRetrySave}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                       fontSize: 10, color: '#EF4444', marginTop: 1, textDecoration: 'underline' }}>
              No se pudo guardar — reintentar
            </button>
          )}
        </div>
        <button onClick={onNew}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#888888', fontSize: 12 }}>
          Nuevo proyecto
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 16px 0', flexShrink: 0 }}>
        <button onClick={handleCopy}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: copied ? 'rgba(16,185,129,0.15)' : '#161616',
            border: `1.5px solid ${copied ? '#10B981' : '#2A2A2A'}`,
            color: copied ? '#10B981' : '#E0E0E0', transition: 'all 200ms',
          }}>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
          {copied ? 'Copiado' : 'Copiar texto'}
        </button>

        <button onClick={handleShare}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: '#7c3aed', border: '1.5px solid #7c3aed', color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)', transition: 'all 200ms',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Compartir archivo
        </button>
      </div>

      {/* Document content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0', minHeight: 0 }}>
        <div style={{
          background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 12,
          padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace',
          fontSize: 12, lineHeight: 1.7, color: '#A0A0A0',
        }}>
          {claudeMd}
        </div>
        <div style={{ height: 20 }} />
      </div>

      {/* Canvas button */}
      {nodes?.length > 0 && (
        <div style={{ padding: '12px 16px 16px', flexShrink: 0, borderTop: '1px solid #141414' }}>
          <button onClick={onOpenCanvas}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, cursor: 'pointer',
              background: 'transparent', border: '1px solid #2A2A2A', color: '#888888',
              fontSize: 13, fontWeight: 600,
            }}>
            Ver nodos en canvas →
          </button>
        </div>
      )}
      <div style={{ padding: '0 16px 14px', flexShrink: 0 }}>
        <FlowFooter />
      </div>
    </div>
    </div>
  );
}
