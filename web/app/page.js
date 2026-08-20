'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getSessionId, getSessionToken } from './lib/supabase';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import ConceptMap from './components/ConceptMap';
import NodeEditor from './components/NodeEditor';
import BuildPanel from './components/BuildPanel';
import { loadProjects, saveProjects, makeProject, makeNode, makeVector } from './lib/storage';

export default function Home() {
  const [projects, setProjects]     = useState([]);
  const [currentId, setCurrentId]   = useState(null);
  const [connected, setConnected]   = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId]   = useState(null);
  const [buildOpen, setBuildOpen]   = useState(false);
  const [buildStatus, setBuildStatus]     = useState('idle');
  const [buildLog, setBuildLog]           = useState('');
  const [buildShareUrl, setBuildShareUrl] = useState('');
  const channelRef  = useRef(null);
  const currentIdRef = useRef(null);

  // Cargar proyectos al inicio
  useEffect(() => {
    const ps = loadProjects();
    setProjects(ps);
    if (ps.length > 0) setCurrentId(ps[0].id);
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

      ch.on('broadcast', { event: 'output' }, ({ payload }) => {
        handleBridgeOutput(payload);
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
    sendEvent('user-message', { text: content });
    updateNode(nodeId, { content });
  }, [sendEvent, updateNode]);

  const handleCanvasTap = useCallback((x, y) => {
    setSelectedNodeId(null);
    const node = addNode('conversation', x - 90, y - 45);
    setEditingNodeId(node.id);
  }, [addNode]);

  const handleNodeTap = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }, []);

  return (
    <AuthGate>
      <div style={{ display: 'flex', height: '100dvh', background: '#0F172A', color: '#E2E8F0' }}>
        {/* Sidebar proyectos */}
        <ProjectsList
          projects={projects}
          currentId={currentId}
          onSelect={setCurrentId}
          onAdd={() => {
            const p = makeProject();
            const firstNode = makeNode('conversation', 200, 200);
            p.nodes = [firstNode];
            setProjects(prev => [p, ...prev]);
            setCurrentId(p.id);
            setTimeout(() => sendEvent('new-project', { projectId: p.id, projectName: p.name }), 500);
          }}
          onDelete={id => {
            setProjects(prev => prev.filter(p => p.id !== id));
            setCurrentId(prev => prev === id ? projects.find(p => p.id !== id)?.id ?? null : prev);
          }}
        />

        {/* Canvas principal */}
        <div style={{ flex: 1, position: 'relative' }}>
          {currentProject ? (
            <ConceptMap
              nodes={currentProject.nodes}
              vectors={currentProject.vectors}
              selectedId={selectedNodeId}
              onNodeTap={handleNodeTap}
              onCanvasTap={handleCanvasTap}
              onNodeMove={moveNode}
              onAddVector={addVector}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '100%', color: '#475569', fontSize: 16 }}>
              Crear o seleccionar un proyecto
            </div>
          )}

          {/* Indicador conexión */}
          <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8,
                        borderRadius: '50%', background: connected ? '#10B981' : '#EF4444' }} />

          {/* Botón build */}
          {currentProject && (
            <button
              onClick={() => setBuildOpen(true)}
              style={{ position: 'absolute', bottom: 20, right: 20, padding: '10px 20px',
                       background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8,
                       cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Construir POC
            </button>
          )}
        </div>

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
      </div>
    </AuthGate>
  );
}
