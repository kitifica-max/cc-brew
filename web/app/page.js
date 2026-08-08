'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from './lib/supabase';

const STORAGE_KEY = 'cc-conversations';
const MAX_CONVS = 20;

function load() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function save(convs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_CONVS))); }
  catch {}
}

function makeConv() {
  return { id: Math.random().toString(36).slice(2) + Date.now().toString(36), title: 'Nueva conversación', createdAt: Date.now(), messages: [], isNewStart: true };
}

const QUICK = [
  { label: '⌃C', text: '\x03' },
  { label: '↵ Enter', text: '\n' },
  { label: '✓ y', text: 'y\n' },
  { label: '✕ n', text: 'n\n' },
];

export default function CCController() {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [view, setView] = useState('chat');
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const currentIdRef = useRef(null);

  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  // Init from localStorage
  useEffect(() => {
    let convs = load();
    if (convs.length === 0) { const c = makeConv(); convs = [c]; save(convs); }
    setConversations(convs);
    setCurrentId(convs[0].id);
  }, []);

  // Persist on change
  useEffect(() => { if (conversations.length) save(conversations); }, [conversations]);

  // Scroll to bottom
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversations, thinking, currentId]);

  // Supabase
  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`);
    channelRef.current = ch;
    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      setThinking(false);
      const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      setConversations(prev => prev.map(c => {
        if (c.id !== currentIdRef.current) return c;
        return { ...c, messages: [...c.messages, { id: Math.random().toString(36).slice(2), role: payload.role, text: payload.text, time }] };
      }));
    });
    ch.subscribe(s => setConnected(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sendRaw = useCallback((text, continueConv = true) => {
    channelRef.current?.send({ type: 'broadcast', event: 'input', payload: { text, token: SESSION_TOKEN, continue: continueConv } });
  }, []);

  const currentConv = conversations.find(c => c.id === currentId);
  const messages = currentConv?.messages ?? [];

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    const isNewStart = currentConv?.isNewStart ?? false;
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setConversations(prev => prev.map(c => {
      if (c.id !== currentId) return c;
      return {
        ...c,
        isNewStart: false,
        title: c.title === 'Nueva conversación' ? text.slice(0, 40) : c.title,
        messages: [...c.messages, { id: Math.random().toString(36).slice(2), role: 'user', text, time }],
      };
    }));
    sendRaw(text + '\n', !isNewStart);
    setInput('');
    setThinking(true);
  }

  function createNew() {
    const c = makeConv();
    setConversations(prev => [c, ...prev]);
    setCurrentId(c.id);
    setThinking(false);
    setView('chat');
  }

  function switchTo(id) {
    setCurrentId(id);
    setThinking(false);
    setView('chat');
  }

  function deleteConv(id) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) { const fresh = makeConv(); setCurrentId(fresh.id); return [fresh]; }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  // ── LIST VIEW ──
  if (view === 'list') return (
    <main style={{ height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#f04e23', padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Claude Code</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Conversaciones</div>
          </div>
          <button onClick={() => setView('chat')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            ← Volver
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversations.map(conv => (
          <div key={conv.id} onClick={() => switchTo(conv.id)} style={{ background: conv.id === currentId ? '#f04e23' : '#fff', borderRadius: 16, padding: '14px 42px 14px 16px', cursor: 'pointer', position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: conv.id === currentId ? '#fff' : '#1a1a1a', marginBottom: 3 }}>{conv.title}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: conv.id === currentId ? 'rgba(255,255,255,0.65)' : '#b0a09a' }}>
              {new Date(conv.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {conv.messages.length} msgs
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteConv(conv.id); }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 15, color: conv.id === currentId ? 'rgba(255,255,255,0.5)' : '#ccc', cursor: 'pointer', padding: 6 }}
            >✕</button>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 14px 36px', flexShrink: 0 }}>
        <button onClick={createNew} style={{ width: '100%', background: '#1a1a1a', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
          + Nueva conversación
        </button>
      </div>
    </main>
  );

  // ── CHAT VIEW ──
  return (
    <main style={{ height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Claude Code</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#00b09b' : 'rgba(255,255,255,0.3)', boxShadow: connected ? '0 0 6px #00b09b' : 'none' }} />
              {connected ? 'Conectado' : 'Desconectado'}
            </div>
            <button onClick={createNew} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
        </div>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{currentConv?.title ?? 'Nueva conversación'}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{conversations.length} conversación{conversations.length !== 1 ? 'es' : ''} · ver todas →</div>
        </button>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#b0a09a', fontSize: 12, fontWeight: 600, marginTop: 40 }}>
            {currentConv?.isNewStart ? 'Nueva sesión de Claude Code' : 'Sesión activa · Escribe un mensaje'}
          </div>
        )}
        {messages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
        {thinking && <TypingIndicator />}
      </div>

      {/* Quick actions */}
      <div style={{ background: '#fde8e4', padding: '8px 14px 4px', display: 'flex', gap: 7, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(({ label, text }) => (
          <button key={label} onClick={() => sendRaw(text)} style={{ flexShrink: 0, background: '#fff', border: '1.5px solid #f0d8d2', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #f0d8d2', padding: '10px 14px 32px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: '#fde8e4', border: '1.5px solid #f0d8d2', borderRadius: 22, padding: '10px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' }}
        />
        <button onClick={handleSend} style={{ width: 40, height: 40, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>›</button>
      </div>

    </main>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === 'user';
  if (msg.role === 'system') return <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#b0a09a', padding: '4px 0' }}>{msg.text}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>}
      <div style={{ maxWidth: '88%', borderRadius: 18, padding: '10px 14px', ...(isUser ? { background: '#f04e23', color: '#fff', borderBottomRightRadius: 4, fontSize: 14, fontWeight: 500, lineHeight: 1.5 } : { background: '#1a1a1a', color: '#e8e2d8', borderBottomLeftRadius: 4, fontFamily: "'SF Mono', 'Fira Code', ui-monospace, monospace", fontSize: 12, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }) }}>
        {msg.text}
      </div>
      <div style={{ fontSize: 9, color: '#b0a09a', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{msg.time}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ background: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a040', animation: `blink 1.2s ${i * 0.2}s infinite` }} />)}
      </div>
    </div>
  );
}
