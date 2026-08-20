'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getSessionId, getSessionToken } from './lib/supabase';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import ConceptMap from './components/ConceptMap';
import NodeEditor from './components/NodeEditor';
import BuildPanel from './components/BuildPanel';
import SettingsPanel from './components/SettingsPanel';
import { loadProjects, saveProjects, makeProject, makeNode, makeVector } from './lib/storage';

export default function Home() {
  const [projects, setProjects]     = useState([]);
  const [currentId, setCurrentId]   = useState(null);
  const [connected, setConnected]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId]   = useState(null);
  const [buildOpen, setBuildOpen]   = useState(false);
  const [buildStatus, setBuildStatus]     = useState('idle');
  const [buildLog, setBuildLog]           = useState('');
  const [buildShareUrl, setBuildShareUrl] = useState('');
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [defaultModel, setDefaultModel]   = useState('claude-sonnet-4-6');
  const [defaultEffort, setDefaultEffort] = useState('medium');
  const channelRef  = useRef(null);
  const currentIdRef = useRef(null);

  // Cargar proyectos y defaults al inicio
  useEffect(() => {
    const ps = loadProjects();
    setProjects(ps);
    if (ps.length > 0) setCurrentId(ps[0].id);
    setDefaultModel(localStorage.getItem('cc_default_model') ?? 'claude-sonnet-4-6');
    setDefaultEffort(localStorage.getItem('cc_default_effort') ?? 'medium');
  }, []);

  // Guardar proyectos cuando cambian
  useEffect(() => { saveProjects(projects); }, [projects]);

  // Derivada sincrónicamente — antes de useEffects que la usen
  const currentProject = projects.find(p => p.id === currentId);

  // Bridge Supabase
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  const updateNode = useCallback((nodeId, patch) => {
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : {
        ...p,
        nodes: p.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n),
      }
    ));
  }, []);

  const addNode = useCallback((type, x, y) => {
    const node = makeNode(type, x, y);
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : { ...p, nodes: [...p.nodes, node] }
    ));
    return node;
  }, []);

  const addVector = useCallback((fromId, toId, label = '') => {
    const vector = makeVector(fromId, toId, label);
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : { ...p, vectors: [...p.vectors, vector] }
    ));
  }, []);

  const moveNode = useCallback((nodeId, x, y) => {
    updateNode(nodeId, { x, y });
  }, [updateNode]);

  // Recibir output de Claude Code desde bridge
  const handleBridgeOutput = useCallback((payload) => {
    if (!currentIdRef.current) return;
    setProjects(prev => {
      const project = prev.find(p => p.id === currentIdRef.current);
      if (!project) return prev;
      const targetNode = [...project.nodes]
        .reverse()
        .find(n => n.type === 'conversation' && !n.aiContent);
      if (!targetNode) return prev;
      return prev.map(p =>
        p.id !== currentIdRef.current ? p : {
          ...p,
          nodes: p.nodes.map(n =>
            n.id === targetNode.id ? { ...n, aiContent: (n.aiContent || '') + (payload.chunk ?? '') } : n
          ),
        }
      );
    });
  }, []);

  // Setup canal Supabase
  useEffect(() => {
    if (!currentId) return;
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data?.session) return;

      const channelName = `session:${getSessionId()}`;
      const ch = supabase.channel(channelName, { config: { private: true } });

      ch.on('broadcast', { event: 'chunk' }, ({ payload }) => {
        handleBridgeOutput({ chunk: payload.text });
      });
      ch.on('broadcast', { event: 'build-progress' }, ({ payload }) => {
        setBuildLog(prev => prev + (payload.chunk ?? ''));
      });
      ch.on('broadcast', { event: 'build-uploading' }, () => {
        setBuildStatus('uploading');
      });
      ch.on('broadcast', { event: 'build-done' }, ({ payload }) => {
        setBuildStatus(payload.success ? 'done' : 'error');
        setBuildShareUrl(payload.url ?? '');
      });

      ch.subscribe(status => {
        setConnected(status === 'SUBSCRIBED');
      });

      channelRef.current = ch;
    })();

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentId, handleBridgeOutput]);

  const sendEvent = useCallback((type, payload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: type,
      payload: { ...payload, token: getSessionToken() },
    });
  }, []);

  const sendNodeContent = useCallback((nodeId, content) => {
    const project = projects.find(p => p.id === currentIdRef.current);
    sendEvent('input', {
      text: content,
      continue: true,
      model: project?.model ?? 'claude-sonnet-4-6',
      effort: project?.effort ?? 'medium',
      skipPermissions: true,
    });
    updateNode(nodeId, { content });
  }, [sendEvent, updateNode, projects]);

  const handleCanvasTap = useCallback((x, y) => {
    setSelectedNodeId(null);
    const node = addNode('conversation', x - 90, y - 45);
    setEditingNodeId(node.id);
  }, [addNode]);

  const handleNodeTap = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }, []);

  const handleDrawerSwitch = (id) => {
    setCurrentId(id);
    sendEvent('switch-project', { id });
    setDrawerOpen(false);
  };

  const handleSaveDefaults = (model, effort) => {
    setDefaultModel(model);
    setDefaultEffort(effort);
    localStorage.setItem('cc_default_model', model);
    localStorage.setItem('cc_default_effort', effort);
  };

  const handleDrawerCreate = (name) => {
    const p = makeProject(name);
    p.model = defaultModel;
    p.effort = defaultEffort;
    const firstNode = makeNode('conversation', 200, 200);
    p.nodes = [firstNode];
    setProjects(prev => [p, ...prev]);
    setCurrentId(p.id);
    sendEvent('create-project', { id: p.id, name: p.name });
    setTimeout(() => sendEvent('new-project', { projectId: p.id, projectName: p.name }), 500);
    setDrawerOpen(false);
  };

  return (
    <AuthGate>
      {/* Canvas pantalla completa */}
      <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0F172A', overflow: 'hidden' }}>

        {currentProject ? (
          <ConceptMap
            nodes={currentProject.nodes}
            vectors={currentProject.vectors}
            selectedId={selectedNodeId}
            onNodeTap={handleNodeTap}
            onCanvasTap={handleCanvasTap}
            onCanvasDeselect={() => { setSelectedNodeId(null); setEditingNodeId(null); }}
            onNodeMove={moveNode}
            onAddVector={addVector}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', flexDirection: 'column', gap: 16, padding: '0 32px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.35 }}>
              <rect x="4" y="4" width="40" height="40" rx="10" stroke="#475569" strokeWidth="2" strokeDasharray="4 3"/>
              <rect x="14" y="17" width="20" height="14" rx="4" stroke="#475569" strokeWidth="1.5"/>
              <line x1="14" y1="22" x2="34" y2="22" stroke="#475569" strokeWidth="1"/>
            </svg>
            <span style={{ fontSize: 15, color: '#64748B' }}>Abre el menú ≡ para crear un proyecto</span>
            <span style={{ fontSize: 13, color: '#475569' }}>Doble toque en el canvas para añadir nodos</span>
          </div>
        )}

        {/* Top bar flotante */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: 'calc(env(safe-area-inset-top, 20px) + 16px) 16px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(to bottom, rgba(15,23,42,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú de proyectos"
            style={{
              pointerEvents: 'auto',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <span style={{
            flex: 1, fontSize: 15, fontWeight: 700, color: '#E2E8F0',
            letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentProject?.name ?? 'Sin proyecto'}
          </span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', flexShrink: 0 }} />
        </div>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex' }}>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
            />
            <div style={{ position: 'relative', zIndex: 51, width: 'min(310px, calc(100vw - 56px))', height: '100%', flexShrink: 0 }}>
              <ProjectsList
                projects={projects}
                currentId={currentId}
                awaitingFolder={null}
                onSwitch={handleDrawerSwitch}
                onCreate={handleDrawerCreate}
                onDelete={id => {
                  setProjects(prev => prev.filter(p => p.id !== id));
                  setCurrentId(prev => prev === id ? projects.find(p => p.id !== id)?.id ?? null : prev);
                  setDrawerOpen(false);
                }}
                onRename={(id, name) => {
                  setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
                }}
                onOpenFolder={() => {}}
                onCancelFolder={() => {}}
                onShowSettings={() => setSettingsOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Editor de nodo */}
        {editingNodeId && currentProject && (
          <NodeEditor
            key={editingNodeId}
            node={currentProject.nodes.find(n => n.id === editingNodeId)}
            onClose={() => setEditingNodeId(null)}
            onSend={content => {
              sendNodeContent(editingNodeId, content);
              setEditingNodeId(null);
            }}
            onTypeChange={type => updateNode(editingNodeId, { type })}
          />
        )}

        {/* Botón build */}
        {currentProject && !editingNodeId && (
          <button
            onClick={() => setBuildOpen(true)}
            style={{
              position: 'absolute', bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))', right: 20,
              padding: '12px 22px', background: '#f04e23', color: '#fff',
              border: 'none', borderRadius: 14, cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              boxShadow: '0 4px 16px rgba(240,78,35,0.4)',
            }}>
            Construir POC
          </button>
        )}

        {/* Panel build */}
        {buildOpen && currentProject && (
          <BuildPanel
            project={currentProject}
            status={buildStatus}
            log={buildLog}
            shareUrl={buildShareUrl}
            onClose={() => {
              setBuildOpen(false);
              setBuildStatus('idle');
              setBuildLog('');
              setBuildShareUrl('');
            }}
            onBuild={() => {
              setBuildStatus('building');
              setBuildLog('');
              setBuildShareUrl('');
              sendEvent('build-poc', { projectId: currentId, projectName: currentProject.name });
            }}
          />
        )}
        {settingsOpen && (
          <SettingsPanel
            defaultModel={defaultModel}
            defaultEffort={defaultEffort}
            onSave={handleSaveDefaults}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </AuthGate>
  );
}
