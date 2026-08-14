'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, getSessionId, getSessionToken } from './lib/supabase';
import { loadProjects, saveProjects, makeProject } from './lib/storage';
import { voiceFilter } from './utils/voiceFilter';
import AuthGate, { useTrial } from './components/AuthGate';
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

function TrialPill() {
  const { daysLeft } = useTrial();
  if (daysLeft === null) return null;
  return (
    <div style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.04em' }}>
        {daysLeft === 0 ? 'TRIAL: hoy vence' : `TRIAL: ${daysLeft}d restantes`}
      </span>
    </div>
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
  const [mcpConfig, setMcpConfig] = useState({});
  const [reconnectKey, setReconnectKey] = useState(0);
  const [streamingMsg, setStreamingMsg] = useState(null); // {msgId, text} | null
  const [pendingPermission, setPendingPermission] = useState(null); // {text, msgId, projectId} | null
  const streamingMsgRef = useRef(null);
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const currentIdRef = useRef(null);
  const wasConnectedRef = useRef(false);
  const unreadRef = useRef(0);

  // ── Voice state ──────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing'
  const [awaitingFolderId, setAwaitingFolderId] = useState(null);
  const awaitingFolderIdRef = useRef(null);
  const knownProjectIdsRef = useRef(new Set());
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);
  // streamingMsgRef se actualiza síncronamente en el chunk handler (no vía useEffect)
  // para evitar race: done chunk llega antes del render → ref null → mensaje desaparece.
  useEffect(() => { awaitingFolderIdRef.current = awaitingFolderId; }, [awaitingFolderId]);
  useEffect(() => { knownProjectIdsRef.current = new Set(projects.map(p => p.id)); }, [projects]);

  const resetDesktopTimeout = useCallback(() => {
    setDesktopActive(true);
    clearTimeout(desktopTimeoutRef.current);
    desktopTimeoutRef.current = setTimeout(() => setDesktopActive(false), 45_000);
  }, []);

  // iOS background + network reconnect + badge clear on foreground
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        unreadRef.current = 0;
        navigator.clearAppBadge?.().catch(() => {});
        setReconnectKey(k => k + 1);
      }
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

  // ── Push subscription registration ───────────────────────────────────────────
  // Se ejecuta tras la primera conexión al canal. sendEvent disponible vía ref.
  const registerPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: (() => {
            const b64 = vapidKey.replace(/-/g, '+').replace(/_/g, '/');
            const raw = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
            return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
          })(),
        });
      }
      channelRef.current?.send({
        type: 'broadcast', event: 'push-subscribe',
        payload: { subscription: sub.toJSON(), token: typeof getSessionToken === 'function' ? getSessionToken() : '' },
      });
    } catch (_) {}
  }, []);

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
  // `active` guard: removeChannel es async, sin guard subscripciones stale
  // siguen recibiendo eventos → respuestas duplicadas.
  useEffect(() => {
    let active = true;
    const ch = supabase.channel(`session:${getSessionId()}`, { config: { private: true } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'heartbeat' }, () => {
      if (!active) return;
      resetDesktopTimeout();
    });

    ch.on('broadcast', { event: 'chunk' }, ({ payload }) => {
      if (!active) return;
      resetDesktopTimeout();
      const { msgId, text, done, projectId: pId } = payload;
      clearTimeout(thinkingTimerRef.current);
      setThinking(false);
      if (done) {
        const prev = streamingMsgRef.current;
        if (prev?.msgId === msgId) {
          streamingMsgRef.current = null; // clear immediately — prevents duplicate commits if done fires >1x
          const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
          const targetId = pId ?? currentIdRef.current;
          setProjects(ps => ps.map(p => p.id !== targetId ? p : {
            ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'claude', text: prev.text, time }],
          }));
          setStreamingMsg(null);
          if (document.visibilityState !== 'visible') {
            unreadRef.current += 1;
            navigator.setAppBadge?.(unreadRef.current).catch(() => {});
          }
        }
      } else {
        const current = streamingMsgRef.current;
        const next = current?.msgId === msgId
          ? { msgId, text: current.text + text }
          : { msgId, text };
        streamingMsgRef.current = next; // sync — ref listo antes del render
        setStreamingMsg(next);
      }
    });

    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      if (!active) return;
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
      if (!active) return;
      if (!payload.messages?.length) return;
      setProjects(prev => prev.map(p => {
        if (p.messages.length > 0) return p;
        const msgs = payload.messages
          .filter(m => m.projectId === p.id || (!m.projectId && p.id === currentIdRef.current))
          .map(m => ({
            id: Math.random().toString(36).slice(2),
            role: m.role === 'claude' ? 'assistant' : m.role,
            text: m.text,
            ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}),
            time: new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          }));
        return msgs.length ? { ...p, messages: msgs } : p;
      }));
    });

    ch.on('broadcast', { event: 'image' }, ({ payload }) => {
      if (!active) return;
      resetDesktopTimeout();
      const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      const targetId = payload.projectId ?? currentIdRef.current;
      setProjects(ps => ps.map(p => p.id !== targetId ? p : {
        ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'claude', imageUrl: payload.url, text: '', time }],
      }));
      if (document.visibilityState !== 'visible') {
        unreadRef.current += 1;
        navigator.setAppBadge?.(unreadRef.current).catch(() => {});
      }
    });

    ch.on('broadcast', { event: 'permission' }, ({ payload }) => {
      if (!active) return;
      resetDesktopTimeout();
      clearTimeout(thinkingTimerRef.current);
      setThinking(false);
      setPendingPermission({ text: payload.text, msgId: payload.msgId, projectId: payload.projectId });
    });

    ch.on('broadcast', { event: 'mcp-config' }, ({ payload }) => {
      if (!active) return;
      setMcpConfig(payload.mcpServers ?? {});
    });

    ch.on('broadcast', { event: 'project-state' }, ({ payload }) => {
      if (!active) return;
      resetDesktopTimeout();
      const pending = awaitingFolderIdRef.current;

      // Case 1: pending id matches a remote project with path (event was received)
      const resolvedById = pending && payload.projects?.find(r => r.id === pending && r.path);
      // Case 2: a brand-new project appeared from desktop (event wasn't received, tray was used)
      const resolvedNew = !resolvedById && pending && payload.projects?.find(
        r => !knownProjectIdsRef.current.has(r.id) && r.path
      );

      setProjects(prev => {
        const updated = prev.map(local => {
          const remote = payload.projects?.find(r => r.id === local.id);
          return remote ? { ...local, path: remote.path, name: remote.name } : local;
        });
        if (resolvedNew) {
          // Remove temp project, add the real one from desktop
          return [makeProject(resolvedNew.name, resolvedNew.id), ...updated.filter(p => p.id !== pending)];
        }
        return updated;
      });

      if (resolvedById || resolvedNew) {
        const targetId = resolvedById?.id ?? resolvedNew?.id;
        setCurrentId(targetId);
        setView('chat');
        setAwaitingFolderId(null);
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return; // cleanup ran before subscribe — don't open stale channel
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      ch.subscribe(s => {
        if (!active) return;
        const isNowConnected = s === 'SUBSCRIBED';
        setConnected(isNowConnected);
        if (isNowConnected) {
          ch.send({ type: 'broadcast', event: 'get-project-state', payload: { token: getSessionToken() } });
          if (wasConnectedRef.current) addSystemMsg('✓ Conexión recuperada');
          wasConnectedRef.current = true;
          registerPush();
        }
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      active = false;
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
    sendEvent('input', {
      text, continue: continueConv,
      model: current?.model ?? 'claude-sonnet-4-6',
      effort: current?.effort ?? 'medium',
      skipPermissions: current?.skipPermissions ?? false,
    });
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

  function handlePermissionResponse(allow) {
    sendRaw(allow ? 'y' : 'n', true);
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setProjects(prev => prev.map(p => p.id !== currentId ? p : {
      ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'system', text: allow ? '✓ Permiso concedido' : '✗ Permiso denegado', time }],
    }));
    setPendingPermission(null);
    setThinking(true);
    clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = setTimeout(() => {
      setThinking(false);
      addSystemMsg('⚠️ Sin respuesta en 3 min — verifica que el desktop esté activo');
    }, THINKING_TIMEOUT_MS);
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

  function handleRenameProject(id, name) {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name } : p);
      saveProjects(next);
      return next;
    });
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
    <>
      <ProjectsList
        projects={projects}
        currentId={currentId}
        awaitingFolder={!!awaitingFolderId}
        onSwitch={handleSwitchProject}
        onDelete={handleDeleteProject}
        onRename={handleRenameProject}
        onCreate={handleCreateProject}
        onOpenFolder={handleOpenFolder}
        onCancelFolder={handleCancelFolder}
        onBack={() => setView('chat')}
        trialPill={<TrialPill />}
        onShowSettings={() => { setShowSettings(true); sendEvent('get-mcp-config', { projectId: currentId }); }}
      />
      {showSettings && currentProject && (
        <SettingsSheet
          project={currentProject}
          mcpConfig={mcpConfig}
          onClose={() => setShowSettings(false)}
          onModelChange={v => updateProjectSettings('model', v)}
          onEffortChange={v => updateProjectSettings('effort', v)}
          onSkipPermissionsChange={v => updateProjectSettings('skipPermissions', v)}
          onOpenDesktop={() => { sendEvent('open-claude-desktop', { projectId: currentId }); setShowSettings(false); }}
          onSaveEnv={(env) => { sendEvent('save-env', { projectId: currentId, env }); setShowSettings(false); }}
          onSaveMcpConfig={(cfg) => { sendEvent('save-mcp-config', { projectId: currentId, mcpServers: cfg }); }}
        />
      )}
    </>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrialPill />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: desktopActive ? '#00b09b' : connected ? '#f0a040' : 'rgba(255,255,255,0.3)', boxShadow: desktopActive ? '0 0 6px #00b09b' : 'none' }} />
              {desktopActive ? 'Desktop activo' : connected ? 'Desktop detenido' : 'Sin conexión'}
            </div>
            <button
              onClick={() => {
                setShowSettings(true);
                sendEvent('get-mcp-config', { projectId: currentId });
              }}
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
        {pendingPermission && !streamingMsg && (
          <PermissionCard
            permission={pendingPermission}
            onAllow={() => handlePermissionResponse(true)}
            onDeny={() => handlePermissionResponse(false)}
          />
        )}
        {streamingMsg && <StreamingRow text={streamingMsg.text} onCancel={cancelThinking} />}
        {thinking && !streamingMsg && !pendingPermission && <TypingIndicator onCancel={cancelThinking} />}
      </div>

      {/* Waiting banner */}
      {thinking && !streamingMsg && (
        <div style={{ background: '#f0fdf4', borderTop: '1px solid #86efac', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11 }}>✓</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#166534', lineHeight: 1.3 }}>
            Claude trabaja en tu Mac — puedes apagar la pantalla o cambiar de app
          </span>
        </div>
      )}
      {streamingMsg && (
        <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11 }}>⚠️</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e', lineHeight: 1.3 }}>
            Recibiendo respuesta — quédate en la app para verla completa
          </span>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ background: '#f5f5f5', padding: '8px 14px 4px', display: 'flex', gap: 7, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(({ label, text }) => (
          <button key={label} onClick={() => sendRaw(text)} style={{ flexShrink: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Mac disclaimer */}
      <div style={{ background: '#fff', padding: '0 14px max(20px, env(safe-area-inset-bottom, 20px))', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#bbb', textAlign: 'center', lineHeight: 1.4 }}>
          Tu Mac debe estar encendida y con CC Controller abierto
        </p>
      </div>

      {showSettings && currentProject && (
        <SettingsSheet
          project={currentProject}
          mcpConfig={mcpConfig}
          onClose={() => setShowSettings(false)}
          onModelChange={v => updateProjectSettings('model', v)}
          onEffortChange={v => updateProjectSettings('effort', v)}
          onSkipPermissionsChange={v => updateProjectSettings('skipPermissions', v)}
          onOpenDesktop={() => { sendEvent('open-claude-desktop', { projectId: currentId }); setShowSettings(false); }}
          onSaveEnv={(env) => { sendEvent('save-env', { projectId: currentId, env }); setShowSettings(false); }}
          onSaveMcpConfig={(cfg) => { sendEvent('save-mcp-config', { projectId: currentId, mcpServers: cfg }); }}
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
  const [copied, setCopied] = useState(false);

  if (msg.role === 'system') return (
    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#999999', padding: '4px 0' }}>{msg.text}</div>
  );

  if (msg.imageUrl) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ maxWidth: '92%', borderRadius: 18, borderBottomLeftRadius: 4, overflow: 'hidden', background: '#1a1a1a' }}>
        <img src={msg.imageUrl} alt="Imagen generada" style={{ display: 'block', maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, paddingLeft: 4 }}>
        <span style={{ fontSize: 9, color: '#999999' }}>{msg.time}</span>
        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, fontWeight: 600, color: '#bbb', textDecoration: 'none' }}>ver original</a>
      </div>
    </div>
  );

  function copyMsg() {
    navigator.clipboard.writeText(msg.text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = msg.text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
        <span style={{ fontSize: 9, color: '#999999' }}>{msg.time}</span>
        {!isUser && (
          <button
            onClick={copyMsg}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, fontWeight: 600, color: copied ? '#00b09b' : '#bbb', fontFamily: 'Sora, sans-serif' }}
          >
            {copied ? '✓ copiado' : 'copiar'}
          </button>
        )}
      </div>
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

function PermissionCard({ permission, onAllow, onDeny }) {
  // Extrae la parte relevante: qué herramienta y qué archivo/comando
  const lines = permission.text.split('\n').filter(l => l.trim());
  const summary = lines.slice(0, 6).join('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', marginBottom: 4, paddingLeft: 4 }}>
        ⚠️ Permiso requerido
      </div>
      <div style={{
        maxWidth: '96%', background: '#fffbeb', border: '1.5px solid #fbbf24',
        borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 14px',
      }}>
        <pre style={{
          margin: '0 0 12px', fontSize: 11, color: '#44403c',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace", lineHeight: 1.6,
        }}>
          {summary}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAllow}
            style={{
              flex: 1, background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}
          >
            Permitir
          </button>
          <button
            onClick={onDeny}
            style={{
              flex: 1, background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 12, padding: '11px 0', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}
          >
            Denegar
          </button>
        </div>
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
