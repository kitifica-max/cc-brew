'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, getSessionId, getSessionToken } from './lib/supabase';
import { loadProjects, saveProjects, makeProject } from './lib/storage';
import { voiceFilter } from './utils/voiceFilter';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import SettingsSheet from './components/SettingsSheet';
import FileUpload from './components/FileUpload';

const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 17H5M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></g></svg>`;
const ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11zm7.318-19.539l-10.94 10.939"/></svg>`;
const ICON_MIC = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="10" height="14" x="7" y="1" rx="5"/><path d="M4 12a8 8 0 0 0 16 0M12 19v4M8 23h8"/></g></svg>`;
const ICON_MIC_STOP = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></g></svg>`;
const ICON_SPINNER = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>`;

const QUICK = [
  { label: 'sí', text: 'sí\n' },
  { label: 'no', text: 'no\n' },
  { label: 'continúa', text: 'continúa\n' },
];

const THINKING_TIMEOUT_MS = 3 * 60 * 1000;

export default function Page() {
  return (
    <AuthGate>
      <CCController />
    </AuthGate>
  );
}

function CCController() {
  const [projects, setProjects] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [desktopActive, setDesktopActive] = useState(false);
  const desktopTimeoutRef = useRef(null);
  const [thinking, setThinking] = useState(false);
  const thinkingTimerRef = useRef(null);
  const [view, setView] = useState('list');
  const [showSettings, setShowSettings] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [streamingMsg, setStreamingMsg] = useState(null); // {msgId, text} | null
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const currentIdRef = useRef(null);
  const wasConnectedRef = useRef(false);

  // ── Voice state ──────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing'
  const [awaitingFolderId, setAwaitingFolderId] = useState(null);
  const awaitingFolderIdRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);
  useEffect(() => { awaitingFolderIdRef.current = awaitingFolderId; }, [awaitingFolderId]);

  const resetDesktopTimeout = useCallback(() => {
    setDesktopActive(true);
    clearTimeout(desktopTimeoutRef.current);
    desktopTimeoutRef.current = setTimeout(() => setDesktopActive(false), 45_000);
  }, []);

  // iOS background + network reconnect
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setReconnectKey(k => k + 1);
    }
    function onOnline() { setReconnectKey(k => k + 1); }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Init from localStorage
  useEffect(() => {
    let ps = loadProjects();
    if (ps.length === 0) { const p = makeProject(); ps = [p]; }
    setProjects(ps);
    setCurrentId(ps[0].id);
  }, []);

  // Persist
  useEffect(() => { if (projects.length) saveProjects(projects); }, [projects]);

  // Scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [projects, thinking, streamingMsg, currentId]);

  const addSystemMsg = useCallback((text) => {
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setProjects(prev => prev.map(p => p.id !== currentIdRef.current ? p : {
      ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'system', text, time }],
    }));
  }, []);

  // Supabase — reconnectKey re-crea canal en iOS background o network recovery
  useEffect(() => {
    const ch = supabase.channel(`session:${getSessionId()}`, { config: { private: true } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'heartbeat' }, () => {
      resetDesktopTimeout();
    });

    ch.on('broadcast', { event: 'chunk' }, ({ payload }) => {
      resetDesktopTimeout();
      const { msgId, text, done, projectId: pId } = payload;
      clearTimeout(thinkingTimerRef.current);
      setThinking(false);
      if (done) {
        setStreamingMsg(prev => {
          if (prev?.msgId === msgId) {
            const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            const targetId = pId ?? currentIdRef.current;
            setProjects(ps => ps.map(p => p.id !== targetId ? p : {
              ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'claude', text: prev.text, time }],
            }));
            return null;
          }
          return prev;
        });
      } else {
        setStreamingMsg(prev => prev?.msgId === msgId
          ? { msgId, text: prev.text + text }
          : { msgId, text });
      }
    });

    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      resetDesktopTimeout();
      clearTimeout(thinkingTimerRef.current);
      setThinking(false);
      // If folder selection was canceled on Mac, clean up the temp project
      if (awaitingFolderIdRef.current && payload.text?.includes('No se seleccionó')) {
        const canceledId = awaitingFolderIdRef.current;
        setProjects(prev => prev.filter(p => p.id !== canceledId));
        setAwaitingFolderId(null);
        return;
      }
      const targetId = payload.projectId ?? currentIdRef.current;
      const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      setProjects(prev => prev.map(p => {
        if (p.id !== targetId) return p;
        return { ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: payload.role, text: payload.text, time }] };
      }));
    });

    ch.on('broadcast', { event: 'history' }, ({ payload }) => {
      if (!payload.messages?.length) return;
      setProjects(prev => prev.map(p => {
        if (p.messages.length > 0) return p;
        const msgs = payload.messages
          .filter(m => m.projectId === p.id || (!m.projectId && p.id === currentIdRef.current))
          .map(m => ({
            id: Math.random().toString(36).slice(2),
            role: m.role === 'claude' ? 'assistant' : m.role,
            text: m.text,
            time: new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          }));
        return msgs.length ? { ...p, messages: msgs } : p;
      }));
    });

    ch.on('broadcast', { event: 'project-state' }, ({ payload }) => {
      resetDesktopTimeout();
      setProjects(prev => prev.map(local => {
        const remote = payload.projects?.find(r => r.id === local.id);
        return remote ? { ...local, path: remote.path, name: remote.name } : local;
      }));
      // Auto-navigate to chat when folder is confirmed by desktop
      setAwaitingFolderId(pending => {
        if (!pending) return null;
        const resolved = payload.projects?.find(r => r.id === pending && r.path);
        if (resolved) {
          setCurrentId(pending);
          setView('chat');
          return null;
        }
        return pending;
      });
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      ch.subscribe(s => {
        const isNowConnected = s === 'SUBSCRIBED';
        setConnected(isNowConnected);
        if (isNowConnected) {
          ch.send({ type: 'broadcast', event: 'get-project-state', payload: { token: getSessionToken() } });
          if (wasConnectedRef.current) addSystemMsg('✓ Conexión recuperada');
          wasConnectedRef.current = true;
        }
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
      supabase.removeChannel(ch);
      clearTimeout(desktopTimeoutRef.current);
    };
  }, [resetDesktopTimeout, reconnectKey, addSystemMsg]);

  const sendEvent = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { ...payload, token: getSessionToken() } });
  }, []);

  const sendRaw = useCallback((text, continueConv = true) => {
    const current = projects.find(p => p.id === currentIdRef.current);
    sendEvent('input', { text, continue: continueConv, model: current?.model ?? 'claude-sonnet-4-6', effort: current?.effort ?? 'medium' });
  }, [projects, sendEvent]);

  const currentProject = projects.find(p => p.id === currentId);
  const messages = currentProject?.messages ?? [];

  // ── Shared submit logic ───────────────────────────────────────────────────────
  function submitMessage(text) {
    const isNewStart = currentProject?.isNewStart ?? false;
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setProjects(prev => prev.map(p => {
      if (p.id !== currentId) return p;
      return { ...p, isNewStart: false, name: p.name === 'Nuevo proyecto' ? text.slice(0, 40) : p.name, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'user', text, time }] };
    }));
    sendRaw(text + '\n', !isNewStart);
    setThinking(true);
    clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = setTimeout(() => {
      setThinking(false);
      addSystemMsg('⚠️ Sin respuesta en 3 min — verifica que el desktop esté activo');
    }, THINKING_TIMEOUT_MS);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    submitMessage(text);
    setInput('');
  }

  function cancelThinking() {
    clearTimeout(thinkingTimerRef.current);
    setThinking(false);
  }

  // ── Voice recording ───────────────────────────────────────────────────────────
  async function startRecording() {
    // Unlock AudioContext on user gesture (required on iOS before playing audio)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAndSend();
      };
      recorder.start(250); // timeslice: ondataavailable fires every 250ms (required on iOS)
      mediaRecorderRef.current = recorder;
      setVoiceState('listening');
    } catch {
      setVoiceState('idle');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setVoiceState('processing');
  }

  async function transcribeAndSend() {
    const mimeType = audioChunksRef.current[0]?.type ?? 'audio/webm';
    const blob = new Blob(audioChunksRef.current, { type: mimeType });
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20_000);
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      const res = await fetch('/api/voice', { method: 'POST', body: fd, signal: controller.signal });
      clearTimeout(tid);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.text?.trim()) submitMessage(json.text.trim());
      else addSystemMsg('⚠️ Voz no reconocida — intenta de nuevo');
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      addSystemMsg(isTimeout ? '⚠️ Tiempo de espera agotado' : `⚠️ Voz: ${err.message?.slice(0, 120)}`);
    } finally {
      setVoiceState('idle');
    }
  }

  function handleMicDown(e) {
    e.preventDefault(); // prevent touch → click double-fire on iOS
    if (voiceState === 'idle') startRecording();
  }

  function handleMicUp(e) {
    e.preventDefault();
    if (voiceState === 'listening') stopRecording();
  }

  // ── Project management ────────────────────────────────────────────────────────
  function handleCreateProject(name) {
    const p = makeProject(name);
    setProjects(prev => [p, ...prev]);
    setCurrentId(p.id);
    setView('chat');
    setThinking(false);
    clearTimeout(thinkingTimerRef.current);
    sendEvent('create-project', { id: p.id, name });
  }

  function handleSwitchProject(id) {
    setCurrentId(id);
    setView('chat');
    setThinking(false);
    clearTimeout(thinkingTimerRef.current);
    const target = projects.find(p => p.id === id);
    if (target?.path) {
      sendEvent('switch-project', { id });
    } else {
      sendEvent('create-project', { id, name: target?.name ?? id });
    }
  }

  function handleOpenFolder() {
    const p = makeProject('Carpeta del Mac');
    setProjects(prev => [p, ...prev]);
    setAwaitingFolderId(p.id);
    sendEvent('open-folder', { id: p.id });
  }

  function handleCancelFolder() {
    const id = awaitingFolderIdRef.current;
    if (id) setProjects(prev => prev.filter(p => p.id !== id));
    setAwaitingFolderId(null);
  }

  function handleDeleteProject(id) {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) { const fresh = makeProject(); setCurrentId(fresh.id); return [fresh]; }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
    sendEvent('delete-project', { id });
  }

  function updateProjectSettings(field, value) {
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, [field]: value } : p));
  }

  if (view === 'list') return (
    <ProjectsList
      projects={projects}
      currentId={currentId}
      awaitingFolder={!!awaitingFolderId}
      onSwitch={handleSwitchProject}
      onDelete={handleDeleteProject}
      onCreate={handleCreateProject}
      onOpenFolder={handleOpenFolder}
      onCancelFolder={handleCancelFolder}
      onBack={() => setView('chat')}
    />
  );

  const voiceLabel = voiceState === 'listening'
    ? 'Escuchando...'
    : voiceState === 'processing'
      ? 'Procesando...'
      : null;

  return (
    <main style={{ height: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Claude Code</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: desktopActive ? '#00b09b' : connected ? '#f0a040' : 'rgba(255,255,255,0.3)', boxShadow: desktopActive ? '0 0 6px #00b09b' : 'none' }} />
              {desktopActive ? 'Desktop activo' : connected ? 'Desktop detenido' : 'Sin conexión'}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              dangerouslySetInnerHTML={{ __html: ICON_SETTINGS }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setView('list')}
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 20, padding: '6px 12px 6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#fff', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>Proyectos</span>
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{currentProject?.name ?? 'Nuevo proyecto'}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {currentProject?.model?.split('-').slice(-2).join(' ')} · {currentProject?.effort}
            </div>
          </div>
        </div>
      </div>

      {/* Voice state banner */}
      {voiceLabel && (
        <div style={{
          background: voiceState === 'listening' ? '#f04e23' : voiceState === 'processing' ? '#333' : '#1a6b5a',
          color: '#fff', textAlign: 'center', padding: '6px 14px', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', flexShrink: 0,
        }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#fff', marginRight: 7, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
          {voiceLabel}
        </div>
      )}

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999999', fontSize: 12, fontWeight: 600, marginTop: 40 }}>
            {currentProject?.path ? currentProject.path.replace(/^\/Users\/[^/]+/, '~') : 'Creando directorio...'}
          </div>
        )}
        {messages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
        {streamingMsg && <StreamingRow text={streamingMsg.text} onCancel={cancelThinking} />}
        {thinking && !streamingMsg && <TypingIndicator onCancel={cancelThinking} />}
      </div>

      {/* Quick actions */}
      <div style={{ background: '#f5f5f5', padding: '8px 14px 4px', display: 'flex', gap: 7, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(({ label, text }) => (
          <button key={label} onClick={() => sendRaw(text)} style={{ flexShrink: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '10px 14px 32px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <FileUpload
          currentProject={currentProject}
          sendEvent={sendEvent}
          onFileSent={(filename) => {
            const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            setProjects(prev => prev.map(p => p.id !== currentId ? p : { ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'system', text: `Subiendo: ${filename}...`, time }] }));
          }}
        />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: '#f5f5f5', border: '1.5px solid #e0e0e0', borderRadius: 22, padding: '10px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' }}
        />
        {/* Mic button — mantener presionado para grabar */}
        <button
          onPointerDown={handleMicDown}
          onPointerUp={handleMicUp}
          onPointerCancel={handleMicUp}
          onPointerLeave={handleMicUp}
          disabled={voiceState === 'processing'}
          title="Mantén presionado para grabar"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: voiceState === 'listening' ? '#f04e23' : voiceState === 'processing' ? '#e0e0e0' : '#1a1a1a',
            color: '#fff',
            cursor: voiceState === 'processing' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            opacity: voiceState === 'processing' ? 0.5 : 1,
            animation: voiceState === 'listening' ? 'micPulse 1s ease-in-out infinite' : 'none',
            touchAction: 'none', userSelect: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: voiceState === 'processing' ? ICON_SPINNER : ICON_MIC }}
        />
        <button
          onClick={handleSend}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: ICON_SEND }}
        />
      </div>

      {showSettings && currentProject && (
        <SettingsSheet
          project={currentProject}
          onClose={() => setShowSettings(false)}
          onModelChange={v => updateProjectSettings('model', v)}
          onEffortChange={v => updateProjectSettings('effort', v)}
          onOpenDesktop={() => { sendEvent('open-claude-desktop', { projectId: currentId }); setShowSettings(false); }}
          onSaveEnv={(env) => { sendEvent('save-env', { projectId: currentId, env }); setShowSettings(false); }}
        />
      )}
    </main>
  );
}

// ─── Markdown renderer (sin dependencias externas) ───────────────────────────

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = code; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ margin: '6px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'ui-monospace,monospace' }}>{lang || 'code'}</span>
        <button onClick={copy} style={{ background: 'none', border: 'none', color: copied ? '#00b09b' : '#666', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Sora,sans-serif', padding: '2px 0' }}>
          {copied ? '✓ copiado' : 'copiar'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '10px 12px', overflowX: 'auto', fontSize: 12, lineHeight: 1.6, color: '#e8e2d8', fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace", background: '#111' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function InlineSegment({ text }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
          return <code key={i} style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace" }}>{p.slice(1, -1)}</code>;
        }
        const boldParts = p.split(/(\*\*[^*\n]+\*\*)/g);
        return boldParts.map((b, j) => {
          if (b.startsWith('**') && b.endsWith('**') && b.length > 4) return <strong key={j}>{b.slice(2, -2)}</strong>;
          return <span key={j}>{b}</span>;
        });
      })}
    </>
  );
}

function MessageContent({ text }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const nl = part.indexOf('\n');
          const lang = nl > 3 ? part.slice(3, nl).trim() : '';
          const code = nl > 3 ? part.slice(nl + 1, -3) : part.slice(3, -3);
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        if (!part) return null;
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {part.split('\n').map((line, j, arr) => (
              <span key={j}><InlineSegment text={line} />{j < arr.length - 1 && '\n'}</span>
            ))}
          </span>
        );
      })}
    </>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === 'user';
  if (msg.role === 'system') return (
    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#999999', padding: '4px 0' }}>{msg.text}</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>}
      <div style={{
        maxWidth: '92%', borderRadius: 18, padding: '10px 14px',
        ...(isUser
          ? { background: '#f04e23', color: '#fff', borderBottomRightRadius: 4, fontSize: 14, fontWeight: 500, lineHeight: 1.5 }
          : { background: '#1a1a1a', color: '#e8e2d8', borderBottomLeftRadius: 4, fontSize: 13, lineHeight: 1.7 }),
      }}>
        {isUser ? msg.text : <MessageContent text={msg.text} />}
      </div>
      <div style={{ fontSize: 9, color: '#999999', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{msg.time}</div>
    </div>
  );
}

function StreamingRow({ text, onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ maxWidth: '92%', background: '#1a1a1a', color: '#e8e2d8', borderRadius: 18, borderBottomLeftRadius: 4, padding: '10px 14px', fontSize: 13, lineHeight: 1.7 }}>
          <MessageContent text={text} />
          <span style={{ display: 'inline-block', width: 8, height: 14, background: '#f04e23', borderRadius: 2, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />
        </div>
        <button
          onClick={onCancel}
          title="Cancelar"
          style={{ background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 16, lineHeight: 1, marginTop: 8, flexShrink: 0 }}
        >×</button>
      </div>
    </div>
  );
}

function TypingIndicator({ onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ background: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a040', animation: `blink 1.2s ${i * 0.2}s infinite` }} />)}
        </div>
        <button
          onClick={onCancel}
          title="Cancelar"
          style={{ background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </div>
    </div>
  );
}
