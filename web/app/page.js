'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, getSessionToken } from './lib/supabase';
import { loadProjects, saveProjects, makeProject } from './lib/storage';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import SettingsSheet from './components/SettingsSheet';
import FileUpload from './components/FileUpload';

const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 17H5M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></g></svg>`;
const ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11zm7.318-19.539l-10.94 10.939"/></svg>`;

// Cada mensaje es un turno nuevo de `claude --print --continue`, así que estos
// atajos solo tienen sentido como respuesta a una pregunta del turno anterior.
const QUICK = [
  { label: 'sí', text: 'sí\n' },
  { label: 'no', text: 'no\n' },
  { label: 'continúa', text: 'continúa\n' },
];

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
  const [view, setView] = useState('chat');
  const [showSettings, setShowSettings] = useState(false);
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const currentIdRef = useRef(null);
  const wasConnectedRef = useRef(false);

  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const resetDesktopTimeout = useCallback(() => {
    setDesktopActive(true);
    clearTimeout(desktopTimeoutRef.current);
    // 45s sin heartbeat = Desktop detenido (heartbeat cada 20s)
    desktopTimeoutRef.current = setTimeout(() => setDesktopActive(false), 45_000);
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
  }, [projects, thinking, currentId]);

  // Supabase
  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`, { config: { private: true } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'heartbeat' }, () => {
      resetDesktopTimeout();
    });

    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      resetDesktopTimeout();
      setThinking(false);
      const targetId = payload.projectId ?? currentIdRef.current;
      const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      setProjects(prev => prev.map(p => {
        if (p.id !== targetId) return p;
        return { ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: payload.role, text: payload.text, time }] };
      }));
    });

    ch.on('broadcast', { event: 'project-state' }, ({ payload }) => {
      resetDesktopTimeout();
      setProjects(prev => prev.map(local => {
        const remote = payload.projects?.find(r => r.id === local.id);
        return remote ? { ...local, path: remote.path } : local;
      }));
    });

    // El canal es privado: Realtime valida el JWT del usuario contra las políticas
    // RLS de `realtime.messages` antes de dejarlo entrar.
    (async () => {
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      ch.subscribe(s => {
        const isNowConnected = s === 'SUBSCRIBED';
        setConnected(isNowConnected);
        if (isNowConnected) {
          // Primera conexión y reconexiones (iOS background) — pedir estado fresco
          ch.send({ type: 'broadcast', event: 'get-project-state', payload: { token: getSessionToken() } });
          wasConnectedRef.current = true;
        }
      });
    })();

    // El JWT caduca; Realtime necesita el nuevo tras cada refresco.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => { sub.subscription.unsubscribe(); supabase.removeChannel(ch); clearTimeout(desktopTimeoutRef.current); };
  }, [resetDesktopTimeout]);

  const sendEvent = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { ...payload, token: getSessionToken() } });
  }, []);

  const sendRaw = useCallback((text, continueConv = true) => {
    const current = projects.find(p => p.id === currentIdRef.current);
    sendEvent('input', { text, continue: continueConv, model: current?.model ?? 'claude-sonnet-4-6', effort: current?.effort ?? 'medium' });
  }, [projects, sendEvent]);

  const currentProject = projects.find(p => p.id === currentId);
  const messages = currentProject?.messages ?? [];

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    const isNewStart = currentProject?.isNewStart ?? false;
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setProjects(prev => prev.map(p => {
      if (p.id !== currentId) return p;
      return { ...p, isNewStart: false, name: p.name === 'Nuevo proyecto' ? text.slice(0, 40) : p.name, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'user', text, time }] };
    }));
    sendRaw(text + '\n', !isNewStart);
    setInput('');
    setThinking(true);
  }

  function handleCreateProject(name) {
    const p = makeProject(name);
    setProjects(prev => [p, ...prev]);
    setCurrentId(p.id);
    setView('chat');
    setThinking(false);
    sendEvent('create-project', { id: p.id, name });
  }

  function handleSwitchProject(id) {
    setCurrentId(id);
    setView('chat');
    setThinking(false);
    const target = projects.find(p => p.id === id);
    if (target?.path) {
      sendEvent('switch-project', { id });
    } else {
      // Proyecto no existe en Electron todavía — registrarlo
      sendEvent('create-project', { id, name: target?.name ?? id });
    }
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
      onSwitch={handleSwitchProject}
      onDelete={handleDeleteProject}
      onCreate={handleCreateProject}
      onBack={() => setView('chat')}
    />
  );

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
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{currentProject?.name ?? 'Nuevo proyecto'}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {currentProject?.model?.split('-').slice(-2).join(' ')} · {currentProject?.effort} · {projects.length} proyecto{projects.length !== 1 ? 's' : ''} →
          </div>
        </button>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999999', fontSize: 12, fontWeight: 600, marginTop: 40 }}>
            {currentProject?.path ? currentProject.path.replace(/^\/Users\/[^/]+/, '~') : 'Creando directorio...'}
          </div>
        )}
        {messages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
        {thinking && <TypingIndicator />}
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
        <button
          onClick={handleSend}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: ICON_SEND }}
        />
      </div>

      {/* Settings sheet */}
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

function MessageRow({ msg }) {
  const isUser = msg.role === 'user';
  if (msg.role === 'system') return <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#999999', padding: '4px 0' }}>{msg.text}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>}
      <div style={{ maxWidth: '88%', borderRadius: 18, padding: '10px 14px', ...(isUser ? { background: '#f04e23', color: '#fff', borderBottomRightRadius: 4, fontSize: 14, fontWeight: 500, lineHeight: 1.5 } : { background: '#1a1a1a', color: '#e8e2d8', borderBottomLeftRadius: 4, fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace", fontSize: 12, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }) }}>
        {msg.text}
      </div>
      <div style={{ fontSize: 9, color: '#999999', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{msg.time}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ background: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a040', animation: `blink 1.2s ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}
