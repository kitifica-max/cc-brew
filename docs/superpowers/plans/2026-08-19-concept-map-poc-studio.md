# Concept Map POC Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar CC Creator de chat interface a un estudio táctil de mapas conceptuales para generar POCs estáticos de productos digitales.

**Architecture:** La app web (mobile) se convierte en un canvas SVG táctil donde nodos y vectores modelan el proceso de diseño de producto (metodología diseño industrial). La IA guía via el bridge Supabase existente — Claude Code corre en el desktop, el web lo muestra. Los POCs son siempre estáticos (HTML/CSS/JS, localStorage) y se comparten vía `ccc.kitifica.com/[slug]`. El desktop se simplifica: sin env vars UI, sin MCP config, sin fases.

**Tech Stack:** Electron + Node.js (desktop), Next.js React (web/mobile), Supabase Realtime, node-pty, SVG canvas táctil

**Spec:** Diseño definido en conversación 2026-08-19 (no hay spec file separado)

## Global Constraints

- Bridge Supabase Realtime NO se modifica — misma arquitectura de canales
- POCs siempre client-side static (HTML/CSS/JS + localStorage/IndexedDB) — sin env vars, sin backend
- Multi-project management SE MANTIENE en el desktop
- node-pty + Claude Code runner SE MANTIENE en desktop
- Sharing via `https://ccc.kitifica.com/[slug]` — slug = nombre del proyecto (kebab-case)
- El usuario usa su propia cuenta Claude Code (el bridge mantiene esa arquitectura)
- Tests: `node --test` (patrón existente)
- No breaking changes a `STORAGE_KEY = 'cc-projects-v2'` — migración suave con `?? []`

---

## Mapa de archivos

**Crear:**
- `web/app/components/ConceptMap.js` — canvas SVG táctil con nodos y vectores
- `web/app/components/NodeCard.js` — renderer de nodo por familia
- `web/app/components/NodeEditor.js` — overlay para editar contenido de un nodo
- `web/app/components/BuildPanel.js` — panel build + share progress

**Modificar:**
- `web/app/lib/storage.js` — nuevo `makeProject()` sin fases, nuevo `makeNode()`, `makeVector()`
- `web/app/page.js` — reemplazar chat UI + PhasePanel con ConceptMap
- `desktop/src/main.js` — remover phase, MCP config, finder IPC handlers
- `desktop/src/bridge.js` — remover `onPhaseChange`, `broadcastPhaseChange`

**Eliminar (dejar vacíos o borrar si no hay otros imports):**
- `web/app/components/PhasePanel.js` — reemplazado por BuildPanel
- `web/app/components/SecretsSheet.js` — sin env vars en POCs estáticos
- `desktop/src/claude-md.js` — sin inyección de CLAUDE.md por fase

---

## Task 1: Nuevo modelo de datos

**Files:**
- Modify: `web/app/lib/storage.js`

**Interfaces:**
- Produces:
  - `makeProject(name, id)` → `{ id, name, nodes: [], vectors: [], createdAt, model, effort }`
  - `makeNode(type, x, y)` → `{ id, type, x, y, content, aiContent, createdAt }`
  - `makeVector(fromId, toId, label)` → `{ id, fromId, toId, label }`
  - Tipos válidos de nodo: `'conversation' | 'reference' | 'definition' | 'process'`

- [ ] **Step 1: Actualizar `makeProject()`**

Reemplazar función entera. Eliminar: `phase`, `stack`, `isNew`, `isNewStart`, `githubRepo`, `netlifyUrl`, `supabaseProject`, `skipPermissions`, `spendLimit`. Mantener: `id`, `name`, `model`, `effort`, `path`, `createdAt`.

```js
export function makeProject(name = 'Nuevo proyecto', id = null) {
  return {
    id: id ?? (Math.random().toString(36).slice(2) + Date.now().toString(36)),
    name,
    path: null,
    model: 'claude-sonnet-4-6',
    effort: 'medium',
    createdAt: Date.now(),
    nodes: [],
    vectors: [],
  };
}
```

- [ ] **Step 2: Agregar `makeNode()` y `makeVector()`**

```js
export const NODE_TYPES = ['conversation', 'reference', 'definition', 'process'];

export function makeNode(type = 'conversation', x = 0, y = 0) {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    type,
    x,
    y,
    content: '',    // texto escrito por usuario
    aiContent: '',  // respuesta de IA (solo conversation nodes)
    createdAt: Date.now(),
  };
}

export function makeVector(fromId, toId, label = '') {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    fromId,
    toId,
    label,
  };
}
```

- [ ] **Step 3: Migración suave en `loadProjects()`**

Los proyectos legacy tienen `messages` y `phase`. Al cargarlos, mapear a nuevo formato sin romper storage existente:

```js
export function loadProjects() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return raw.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path ?? null,
      model: p.model ?? 'claude-sonnet-4-6',
      effort: p.effort ?? 'medium',
      createdAt: p.createdAt ?? Date.now(),
      nodes: p.nodes ?? [],
      vectors: p.vectors ?? [],
    }));
  } catch { return []; }
}
```

- [ ] **Step 4: Verificar — abrir app local, crear proyecto, revisar localStorage**

```bash
cd web && npm run dev
```

Abrir DevTools → Application → localStorage → key `cc-projects-v2` → verificar estructura `{ nodes: [], vectors: [] }`.

- [ ] **Step 5: Commit**

```bash
git add web/app/lib/storage.js
git commit -m "refactor(storage): nuevo modelo nodes/vectors, migración suave desde messages/phase"
```

---

## Task 2: Simplificación desktop

**Files:**
- Modify: `desktop/src/main.js`
- Modify: `desktop/src/bridge.js`

**Interfaces:**
- Consumes: `makeProject()` sin `phase`
- Produces: desktop sin phase IPC, sin MCP config IPC, sin finder IPC

- [ ] **Step 1: Remover phase IPC de `main.js`**

Eliminar:
- `ipcMain.handle('panel:advance-phase', ...)` (línea ~540)
- `bridge.onPhaseChange = ...` (línea ~474)
- Import/uso de `updateProjectPhase` si queda sin usar

```bash
grep -n "phase\|advance-phase\|updateProjectPhase" desktop/src/main.js
```

Eliminar los bloques encontrados.

- [ ] **Step 2: Remover MCP config IPC de `main.js`**

Eliminar:
- `const mcpServers = readMcpConfig(projectId)` y `bridge.broadcastMcpConfig(...)` (línea ~393)
- `bridge.onSaveMcpConfig = ...` (línea ~400)
- Imports `readMcpConfig`, `saveMcpConfig` si quedan huérfanos

```bash
grep -n "mcpServers\|readMcpConfig\|saveMcpConfig\|onSaveMcpConfig\|broadcastMcpConfig" desktop/src/main.js
```

- [ ] **Step 3: Remover finder IPC de `main.js`**

Eliminar `ipcMain.handle('panel:open-finder', ...)` (línea ~559).

- [ ] **Step 4: Limpiar `bridge.js`**

```bash
grep -n "phase\|PhaseChange\|mcpConfig\|McpConfig" desktop/src/bridge.js
```

Eliminar `onPhaseChange`, `broadcastPhaseChange`, `onSaveMcpConfig`, `broadcastMcpConfig` de bridge.js.

- [ ] **Step 5: Verificar que el desktop arranca sin errores**

```bash
cd desktop && npm start 2>&1 | head -30
```

Sin errores de IPC undefined o import missing.

- [ ] **Step 6: Commit**

```bash
git add desktop/src/main.js desktop/src/bridge.js
git commit -m "refactor(desktop): remover phase, MCP config, finder — simplificar a bridge puro"
```

---

## Task 3: Canvas ConceptMap + NodeCard

**Files:**
- Create: `web/app/components/ConceptMap.js`
- Create: `web/app/components/NodeCard.js`

**Interfaces:**
- Consumes: `nodes: Node[]`, `vectors: Vector[]`, callbacks `onNodeMove(id, x, y)`, `onNodeTap(id)`, `onCanvasTap(x, y)`, `onAddVector(fromId, toId)`
- Produces: SVG canvas táctil renderizando nodos y vectores

- [ ] **Step 1: Crear `NodeCard.js`**

Colores por familia:
- `conversation`: azul `#3B82F6` — pregunta IA / respuesta usuario
- `reference`: verde `#10B981` — imagen, link, documento
- `definition`: naranja `#F59E0B` — concepto, término, requisito
- `process`: morado `#8B5CF6` — paso, flujo, decisión

```jsx
// web/app/components/NodeCard.js
const TYPE_COLORS = {
  conversation: '#3B82F6',
  reference:    '#10B981',
  definition:   '#F59E0B',
  process:      '#8B5CF6',
};

const TYPE_LABELS = {
  conversation: 'Conversación',
  reference:    'Referencia',
  definition:   'Definición',
  process:      'Proceso',
};

const NODE_W = 180;
const NODE_H = 90;

export default function NodeCard({ node, selected, onTap }) {
  const color = TYPE_COLORS[node.type] ?? '#6B7280';
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={() => onTap(node.id)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={NODE_W} height={NODE_H} rx={12}
        fill={selected ? color : '#1E293B'}
        stroke={color} strokeWidth={selected ? 3 : 1.5}
      />
      <text x={10} y={18} fill={color} fontSize={10} fontWeight="600" fontFamily="sans-serif">
        {TYPE_LABELS[node.type]}
      </text>
      <foreignObject x={10} y={24} width={NODE_W - 20} height={NODE_H - 30}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif',
                   overflow: 'hidden', display: '-webkit-box',
                   WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {node.aiContent || node.content || '...'}
        </div>
      </foreignObject>
    </g>
  );
}
```

- [ ] **Step 2: Crear `ConceptMap.js`**

```jsx
// web/app/components/ConceptMap.js
'use client';
import { useRef, useState, useCallback } from 'react';
import NodeCard from './NodeCard';

const NODE_W = 180;
const NODE_H = 90;

export default function ConceptMap({ nodes, vectors, selectedId, onNodeTap, onCanvasTap, onNodeMove }) {
  const svgRef = useRef(null);
  const dragging = useRef(null); // { id, startX, startY, nodeX, nodeY }
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });

  const toSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + (clientX - rect.left) * (viewBox.w / rect.width),
      y: viewBox.y + (clientY - rect.top) * (viewBox.h / rect.height),
    };
  };

  const onPointerDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragging.current = { id: nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = (e.clientX - dragging.current.startX) * (viewBox.w / svgRef.current.clientWidth);
    const dy = (e.clientY - dragging.current.startY) * (viewBox.h / svgRef.current.clientHeight);
    onNodeMove(dragging.current.id, dragging.current.nodeX + dx, dragging.current.nodeY + dy);
  };

  const onPointerUp = (e, nodeId) => {
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    const dx = Math.abs(e.clientX - d.startX);
    const dy = Math.abs(e.clientY - d.startY);
    if (dx < 5 && dy < 5) onNodeTap(nodeId); // tap, not drag
  };

  const onSvgClick = (e) => {
    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    onCanvasTap(x, y);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      style={{ width: '100%', height: '100%', background: '#0F172A', touchAction: 'none' }}
      onClick={onSvgClick}
      onPointerMove={onPointerMove}
    >
      {/* Vectores (flechas) */}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#475569" />
        </marker>
      </defs>
      {vectors.map(v => {
        const from = nodes.find(n => n.id === v.fromId);
        const to   = nodes.find(n => n.id === v.toId);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H / 2;
        const x2 = to.x   + NODE_W / 2, y2 = to.y   + NODE_H / 2;
        return (
          <g key={v.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#475569" strokeWidth={1.5} markerEnd="url(#arrow)" />
            {v.label && (
              <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} fill="#94A3B8" fontSize={10}
                textAnchor="middle" fontFamily="sans-serif">
                {v.label}
              </text>
            )}
          </g>
        );
      })}
      {/* Nodos */}
      {nodes.map(node => (
        <g
          key={node.id}
          onPointerDown={e => onPointerDown(e, node.id)}
          onPointerUp={e => onPointerUp(e, node.id)}
        >
          <NodeCard node={node} selected={selectedId === node.id} onTap={onNodeTap} />
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 3: Verificar que compila sin errores**

```bash
cd web && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add web/app/components/ConceptMap.js web/app/components/NodeCard.js
git commit -m "feat(canvas): ConceptMap SVG táctil con NodeCard por familia"
```

---

## Task 4: Reemplazar page.js con vista ConceptMap

**Files:**
- Modify: `web/app/page.js` (reemplazar ~1388 líneas — es un refactor completo)
- Delete: `web/app/components/PhasePanel.js`
- Delete: `web/app/components/SecretsSheet.js`

**Interfaces:**
- Consumes: `makeProject()`, `makeNode()`, `makeVector()`, `loadProjects()`, `saveProjects()` del Task 1
- Consumes: `ConceptMap` del Task 3
- Consumes: bridge Supabase (canales existentes: `cc-bridge-[id]`)
- Produces: UI de mapa conceptual reemplazando el chat

- [ ] **Step 1: Leer page.js actual para identificar qué mantener**

Mantener de `page.js`:
- Setup Supabase channel (`createClient`, `channel.subscribe`)
- `sendEvent(type, payload)` — envía a desktop vía broadcast
- `sendRaw(text, isPermission)` — envía texto a Claude Code
- `onRawOutput` callback — recibe output de Claude Code
- `useRef` para `channelRef`, `currentIdRef`
- Barra de proyectos (sidebar/list)
- AuthGate wrapper
- `useState` para `projects`, `currentId`, `connected`

Eliminar de `page.js`:
- Todo el chat UI (`messages`, `input`, `thinking`, `streamingMsg`)
- PhasePanel, PhaseAdvanceCard
- SecretsSheet, SettingsSheet (env vars section)
- Phase nudge logic
- Env var hints

- [ ] **Step 2: Escribir nuevo `page.js`**

La nueva página tiene 3 zonas:
1. Sidebar izquierdo: lista de proyectos (ya existe como `ProjectsList.js`)
2. Canvas principal: `ConceptMap` con nodos y vectores
3. Panel inferior/modal: `NodeEditor` cuando se toca un nodo

```jsx
// web/app/page.js (resumen estructural — implementar completo)
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
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
    // El output de Claude Code llega como texto plano
    // Lo asignamos al nodo conversation activo (el más reciente sin aiContent)
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
    // Leer supabase config desde env del cliente
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey || !currentId) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channelName = `cc-bridge-${currentId}`;
    const ch = supabase.channel(channelName);

    ch.on('broadcast', { event: 'output' }, ({ payload }) => {
      handleBridgeOutput(payload);
    });

    ch.subscribe(status => {
      setConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [currentId, handleBridgeOutput]);

  const sendEvent = useCallback((type, payload) => {
    channelRef.current?.send({ type: 'broadcast', event: type, payload });
  }, []);

  // Enviar texto de nodo a Claude Code
  const sendNodeContent = useCallback((nodeId, content) => {
    sendEvent('user-message', { text: content });
    updateNode(nodeId, { content });
  }, [sendEvent, updateNode]);

  const handleCanvasTap = useCallback((x, y) => {
    // Tap en canvas vacío = nuevo nodo conversation
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
            setProjects(prev => [p, ...prev]);
            setCurrentId(p.id);
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
            onClose={() => setBuildOpen(false)}
            onBuild={() => sendEvent('build-poc', { projectId: currentId, projectName: currentProject.name })}
          />
        )}
      </div>
    </AuthGate>
  );
}
```

- [ ] **Step 3: Crear `NodeEditor.js`**

Panel lateral que aparece al tocar un nodo. Permite: editar `content`, cambiar `type`, ver `aiContent`.

```jsx
// web/app/components/NodeEditor.js
const TYPE_OPTIONS = ['conversation', 'reference', 'definition', 'process'];
const TYPE_LABELS  = { conversation: 'Conversación', reference: 'Referencia', definition: 'Definición', process: 'Proceso' };

export default function NodeEditor({ node, onClose, onSend, onTypeChange }) {
  const [draft, setDraft] = React.useState(node?.content ?? '');
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
```

- [ ] **Step 4: Verificar que la app carga y muestra canvas**

```bash
cd web && npm run dev
```

Abrir `localhost:3000` — debe mostrar canvas oscuro con botón "Construir POC". Tap en canvas = aparece nodo azul.

- [ ] **Step 5: Eliminar archivos obsoletos**

```bash
rm web/app/components/PhasePanel.js web/app/components/SecretsSheet.js
```

Verificar que `page.js` no importa los archivos eliminados.

- [ ] **Step 6: Build completo**

```bash
cd web && npm run build 2>&1 | tail -20
```

Sin errores de compilación.

- [ ] **Step 7: Commit**

```bash
git add web/app/page.js web/app/components/NodeEditor.js
git rm web/app/components/PhasePanel.js web/app/components/SecretsSheet.js
git commit -m "feat(ui): reemplazar chat con ConceptMap canvas — nodos táctiles, NodeEditor"
```

---

## Task 5: Flujo de conversación guiada por IA

**Files:**
- Modify: `web/app/page.js` — primer nodo automático en proyecto nuevo
- Modify: `desktop/src/bridge.js` — evento `new-project` que dispara pregunta inicial

**Interfaces:**
- Consumes: canal bridge `cc-bridge-[projectId]`
- Produces: al crear proyecto nuevo, Claude Code recibe instrucción y responde con primera pregunta; esa respuesta aparece como `aiContent` del primer nodo `conversation`

- [ ] **Step 1: Agregar starter en `page.js` — primer nodo al crear proyecto**

En el handler `onAdd` de ProjectsList, después de crear el proyecto, agregar primer nodo y enviar evento:

```js
const onAdd = () => {
  const p = makeProject();
  const firstNode = makeNode('conversation', 200, 200);
  p.nodes = [firstNode];
  setProjects(prev => [p, ...prev]);
  setCurrentId(p.id);
  // El bridge recibe este evento y Claude Code hace la primera pregunta
  setTimeout(() => sendEvent('new-project', { projectId: p.id, projectName: p.name }), 500);
};
```

- [ ] **Step 2: Agregar handler `new-project` en `bridge.js` del desktop**

Cuando bridge recibe `new-project`, Claude Code recibe un mensaje de sistema que lo instruye a hacer la primera pregunta:

```js
// En bridge.js, dentro del setup del canal:
ch.on('broadcast', { event: 'new-project' }, ({ payload }) => {
  if (bridge.onNewProject) bridge.onNewProject(payload.projectId, payload.projectName);
});
```

- [ ] **Step 3: Agregar `onNewProject` en `main.js`**

```js
bridge.onNewProject = (projectId, projectName) => {
  // Enviar a Claude Code via pty el contexto del proyecto nuevo
  const projectPty = activeProjects.get(projectId);
  if (!projectPty) return;
  const prompt = `Nuevo mapa conceptual: "${projectName}". Eres un facilitador de diseño de producto. Haz UNA pregunta clave para entender la necesidad que resuelve este producto. Responde solo con la pregunta, sin explicación.`;
  projectPty.write(prompt + '\r');
};
```

- [ ] **Step 4: Verificar flujo end-to-end**

1. Crear proyecto nuevo en mobile/web
2. Verificar que aparece nodo azul vacío
3. Verificar en desktop que Claude Code recibe el prompt
4. Verificar que `aiContent` del primer nodo se llena con la pregunta de Claude

- [ ] **Step 5: Commit**

```bash
git add web/app/page.js desktop/src/bridge.js desktop/src/main.js
git commit -m "feat(ai-flow): primer nodo con pregunta guiada en proyecto nuevo"
```

---

## Task 6: Build POC + Share

**Files:**
- Create: `web/app/components/BuildPanel.js`
- Modify: `desktop/src/bridge.js` — evento `build-poc`
- Modify: `desktop/src/main.js` — ejecutar build + subir a ccc.kitifica.com

**Interfaces:**
- Consumes: evento `build-poc: { projectId, projectName }`
- Consumes: `project.path` — carpeta donde Claude Code generó el POC
- Produces: archivos estáticos en `ccc.kitifica.com/[slug]`
- Slug = `projectName` en kebab-case

- [ ] **Step 1: Crear `BuildPanel.js`**

```jsx
// web/app/components/BuildPanel.js
import { useState, useEffect, useRef } from 'react';

export default function BuildPanel({ project, onClose, onBuild }) {
  const [status, setStatus] = useState('idle'); // idle | building | uploading | done | error
  const [log, setLog] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Escuchar eventos de progreso via prop (se pasan desde page.js)
  // page.js debe pasar onBuildProgress y onBuildDone como props

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
                  alignItems: 'flex-end', zIndex: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: '#1E293B', borderRadius: '16px 16px 0 0',
                    padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#E2E8F0', fontSize: 18 }}>Construir POC</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8',
                                             cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        {status === 'idle' && (
          <div>
            <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 16px' }}>
              Claude Code generará el POC estático en la carpeta del proyecto.
              El resultado se subirá a <code style={{ color: '#6366F1' }}>ccc.kitifica.com/{project.name.toLowerCase().replace(/\s+/g, '-')}</code>
            </p>
            <button onClick={() => { setStatus('building'); onBuild(); }}
              style={{ width: '100%', padding: '12px 0', background: '#6366F1', color: '#fff',
                       border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>
              Iniciar Build
            </button>
          </div>
        )}

        {(status === 'building' || status === 'uploading') && (
          <div>
            <p style={{ color: '#6366F1', fontWeight: 600, marginBottom: 12 }}>
              {status === 'building' ? 'Construyendo...' : 'Subiendo...'}
            </p>
            <pre style={{ background: '#0F172A', borderRadius: 8, padding: 12, fontSize: 11,
                          color: '#94A3B8', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {log || 'Iniciando...'}
            </pre>
          </div>
        )}

        {status === 'done' && (
          <div>
            <p style={{ color: '#10B981', fontWeight: 600 }}>POC disponible:</p>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#6366F1', fontSize: 14, wordBreak: 'break-all' }}>
              {shareUrl}
            </a>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p style={{ color: '#EF4444' }}>Error en el build:</p>
            <pre style={{ background: '#0F172A', borderRadius: 8, padding: 12, fontSize: 11,
                          color: '#EF4444' }}>{log}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Nota:** `BuildPanel` recibe estado de `page.js`. `page.js` escucha eventos `build-progress` y `build-done` del bridge y los pasa como props o state.

- [ ] **Step 2: Agregar listeners de progreso en `page.js`**

En el setup del canal Supabase:
```js
ch.on('broadcast', { event: 'build-progress' }, ({ payload }) => {
  setBuildLog(prev => prev + payload.chunk);
});
ch.on('broadcast', { event: 'build-done' }, ({ payload }) => {
  setBuildStatus(payload.success ? 'done' : 'error');
  setBuildShareUrl(payload.url ?? '');
});
```

Agregar state: `const [buildStatus, setBuildStatus] = useState('idle')`, `buildLog`, `buildShareUrl`. Pasar a `BuildPanel`.

- [ ] **Step 3: Handler `build-poc` en `bridge.js` del desktop**

```js
ch.on('broadcast', { event: 'build-poc' }, ({ payload }) => {
  if (bridge.onBuildPoc) bridge.onBuildPoc(payload.projectId, payload.projectName);
});
```

- [ ] **Step 4: Implementar `onBuildPoc` en `main.js`**

```js
bridge.onBuildPoc = async (projectId, projectName) => {
  const project = getProject(projectId);
  if (!project?.path) return bridge.broadcastRaw(projectId, 'build-done', { success: false, url: '' });

  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outDir = path.join(project.path, 'dist');

  // Instruir a Claude Code a generar el POC estático
  const pty = activeProjects.get(projectId);
  if (pty) {
    pty.write(`Genera un POC estático completo en la carpeta ./dist — HTML/CSS/JS puro, sin servidor, sin env vars. Incluye index.html como punto de entrada.\r`);
  }

  // Esperar señal de que Claude Code terminó (evento 'output' con texto que incluye "POC generado" o similar)
  // Por ahora: mock — esperar 3s y subir lo que haya en ./dist
  await new Promise(r => setTimeout(r, 3000));

  await uploadPoc(outDir, slug, projectId);
};

async function uploadPoc(dir, slug, projectId) {
  const { execFile } = await import('child_process');
  // Zip del directorio de salida
  const zipPath = path.join(os.tmpdir(), `${slug}.zip`);
  await new Promise((res, rej) => {
    execFile('zip', ['-r', zipPath, '.'], { cwd: dir }, err => err ? rej(err) : res());
  });

  // POST al endpoint de kitifica
  const form = new FormData();
  form.append('slug', slug);
  form.append('file', new Blob([fs.readFileSync(zipPath)]), `${slug}.zip`);

  const resp = await fetch('https://ccc.kitifica.com/api/deploy', {
    method: 'POST',
    body: form,
    headers: { 'X-Project-Id': projectId },
  });

  const url = `https://ccc.kitifica.com/${slug}`;
  bridge.broadcastRaw(projectId, 'build-done', { success: resp.ok, url });
}
```

**Nota:** La función `bridge.broadcastRaw(projectId, event, payload)` debe agregarse a `bridge.js` como método utilitario si no existe.

- [ ] **Step 5: Verificar flujo build (mock)**

1. Abrir proyecto con `path` configurado
2. Tap "Construir POC"
3. Verificar en web que aparece "Construyendo..."
4. Verificar en desktop que llega el evento y se ejecuta `onBuildPoc`
5. Verificar que al completar aparece URL

- [ ] **Step 6: Commit**

```bash
git add web/app/components/BuildPanel.js web/app/page.js desktop/src/bridge.js desktop/src/main.js
git commit -m "feat(build): BuildPanel + upload a ccc.kitifica.com/slug via POST /api/deploy"
```

---

## Post-plan: endpoint kitifica

El endpoint `POST https://ccc.kitifica.com/api/deploy` se implementa en infraestructura kitifica (fuera de este repo). Contrato:

```
POST /api/deploy
Content-Type: multipart/form-data

Fields:
  slug: string (kebab-case, único por proyecto)
  file: zip con index.html en raíz

Response:
  200 OK → { url: "https://ccc.kitifica.com/{slug}" }
  4xx   → error
```

La infra sirve los archivos del zip en `ccc.kitifica.com/{slug}/` (nginx + S3 o similar).
