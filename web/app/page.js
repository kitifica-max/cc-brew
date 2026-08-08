'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from './lib/supabase';

const APPROVAL_PATTERNS = [
  /\[y\/n\]/i,
  /approve\?/i,
  /\(y\/n\)/i,
  /continue\?/i,
  /proceed\?/i,
];

function isApprovalPrompt(text) {
  return APPROVAL_PATTERNS.some((p) => p.test(text));
}

export default function Terminal() {
  const [buffer, setBuffer] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const termRef = useRef(null);
  const channelRef = useRef(null);

  const sendInput = useCallback((text) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'input',
      payload: { text, token: SESSION_TOKEN },
    });
  }, []);

  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'output' }, ({ payload }) => {
      setBuffer((prev) => {
        const next = prev + payload.text;
        return next.length > 51_200 ? next.slice(-51_200) : next;
      });
      setNeedsApproval(isApprovalPrompt(payload.text));
    });

    ch.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [buffer]);

  function handleSend() {
    if (!input.trim()) return;
    sendInput(input + '\n');
    setInput('');
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 420, background: '#f04e23', borderRadius: 24, padding: '16px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Claude Code
          </span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#fff' : 'rgba(255,255,255,0.3)' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Session<br />{SESSION_ID.toUpperCase()}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
          {connected ? '● Conectado' : '○ Desconectado'}
        </div>
      </div>

      {/* Terminal output */}
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: '#1a1a1a', padding: '6px 14px', fontSize: 9, fontWeight: 700, color: '#00b09b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ● Live output
        </div>
        <pre
          ref={termRef}
          style={{
            padding: '12px 14px',
            fontFamily: 'monospace',
            fontSize: 10,
            lineHeight: 1.7,
            color: '#333',
            background: '#fafafa',
            height: 260,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {buffer || '// Esperando output de Claude Code...'}
        </pre>
      </div>

      {/* Approval card */}
      {needsApproval && (
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '2px solid #f04e23', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: '#f04e23', padding: '8px 16px', fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ⚡ Aprobación requerida
          </div>
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Claude quiere actuar</p>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#999' }}>Revisa el output de arriba</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
            <button
              onClick={() => { sendInput('y\n'); setNeedsApproval(false); }}
              style={{ background: '#1a1a1a', border: 'none', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              ✓ Aprobar
            </button>
            <button
              onClick={() => { sendInput('n\n'); setNeedsApproval(false); }}
              style={{ background: '#fde8e4', border: 'none', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 800, color: '#f04e23', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              ✕ Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ width: '100%', maxWidth: 420, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Ctrl+C', text: '\x03' },
          { label: 'Enter ↵', text: '\n' },
          { label: 'y', text: 'y\n' },
          { label: 'n', text: 'n\n' },
        ].map(({ label, text }) => (
          <button
            key={label}
            onClick={() => sendInput(text)}
            style={{ background: '#fff', border: 'none', borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 700, color: '#555', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un comando..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', background: 'transparent' }}
        />
        <button
          onClick={handleSend}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ›
        </button>
      </div>

    </main>
  );
}
