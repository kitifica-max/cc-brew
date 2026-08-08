'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from './lib/supabase';

const QUICK = [
  { label: '⌃C Interrumpir', text: '\x03' },
  { label: '↵ Enter', text: '\n' },
  { label: '✓ y', text: 'y\n' },
  { label: '✕ n', text: 'n\n' },
];

export default function CCController() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const inputRef = useRef(null);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      role,
      text,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, []);

  const sendRaw = useCallback((text) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'input',
      payload: { text, token: SESSION_TOKEN },
    });
  }, []);

  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      setThinking(false);
      addMessage(payload.role, payload.text);
    });

    ch.subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [addMessage]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    addMessage('user', text);
    sendRaw(text + '\n');
    setInput('');
    setThinking(true);
  }

  return (
    <main style={{ height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Claude Code
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#00b09b' : 'rgba(255,255,255,0.3)',
              boxShadow: connected ? '0 0 6px #00b09b' : 'none',
            }} />
            {connected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Session {SESSION_ID.toUpperCase()}
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#b0a09a', fontSize: 12, fontWeight: 600, marginTop: 40 }}>
            Sesión activa · Escribe un mensaje
          </div>
        )}

        {messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)}

        {thinking && <TypingIndicator />}
      </div>

      {/* Quick actions */}
      <div style={{ background: '#fde8e4', padding: '8px 14px 4px', display: 'flex', gap: 7, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(({ label, text }) => (
          <button
            key={label}
            onClick={() => sendRaw(text)}
            style={{
              flexShrink: 0,
              background: '#fff',
              border: '1.5px solid #f0d8d2',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 11,
              fontWeight: 700,
              color: '#555',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'Sora, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #f0d8d2', padding: '10px 14px 32px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un comando..."
          style={{
            flex: 1,
            background: '#fde8e4',
            border: '1.5px solid #f0d8d2',
            borderRadius: 22,
            padding: '10px 16px',
            fontSize: 16,
            fontWeight: 500,
            color: '#1a1a1a',
            fontFamily: 'Sora, sans-serif',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: '#f04e23',
            border: 'none',
            color: '#fff',
            fontSize: 22,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ›
        </button>
      </div>

    </main>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === 'user';

  if (msg.role === 'system') {
    return (
      <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#b0a09a', padding: '4px 0' }}>
        {msg.text}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>
          Claude Code
        </div>
      )}
      <div style={{
        maxWidth: '88%',
        borderRadius: 18,
        padding: '10px 14px',
        ...(isUser ? {
          background: '#f04e23',
          color: '#fff',
          borderBottomRightRadius: 4,
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.5,
        } : {
          background: '#1a1a1a',
          color: '#e8e2d8',
          borderBottomLeftRadius: 4,
          fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace",
          fontSize: 12,
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }),
      }}>
        {msg.text}
      </div>
      <div style={{ fontSize: 9, color: '#b0a09a', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
        {msg.time}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>
        Claude Code
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#f0a040',
            animation: `blink 1.2s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
