'use client';
import { useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import NodeCard, { NODE_W, NODE_H } from './NodeCard';

const MIN_VB_W = 200;
const MAX_VB_W = 6000;

const ConceptMap = forwardRef(function ConceptMap({
  nodes, vectors, selectedId,
  onNodeTap, onCanvasTap, onCanvasDeselect, onNodeMove,
  onDelete, connectingFromId, onConnect,
}, ref) {
  const svgRef         = useRef(null);
  const dragging       = useRef(null);
  const panRef         = useRef(null);
  const pinchRef       = useRef(null);
  const svgPointers    = useRef(new Map()); // pointerId → {x, y}  (SVG-captured only)
  const lastTap        = useRef({ time: 0, x: 0, y: 0 });

  const [viewBox, _setVB] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const viewBoxRef = useRef(viewBox);
  const setViewBox = useCallback((vb) => {
    viewBoxRef.current = vb;
    _setVB(vb);
  }, []);

  useImperativeHandle(ref, () => ({
    fitAll() {
      if (!nodes?.length) return;
      const pad = 80;
      const minX = Math.min(...nodes.map(n => n.x)) - pad;
      const minY = Math.min(...nodes.map(n => n.y)) - pad;
      const maxX = Math.max(...nodes.map(n => n.x + NODE_W)) + pad;
      const maxY = Math.max(...nodes.map(n => n.y + NODE_H)) + pad;
      setViewBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    },
  }), [nodes, setViewBox]);

  const toSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vb = viewBoxRef.current;
    return {
      x: vb.x + (clientX - rect.left) * (vb.w / rect.width),
      y: vb.y + (clientY - rect.top)  * (vb.h / rect.height),
    };
  };

  /* ── Node drag ──────────────────────────────────────── */
  const onNodePointerDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragging.current = { id: nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const onNodePointerUp = (e, nodeId) => {
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    const dx = Math.abs(e.clientX - d.startX);
    const dy = Math.abs(e.clientY - d.startY);
    if (dx < 5 && dy < 5) {
      if (connectingFromId && nodeId !== connectingFromId) {
        onConnect?.(nodeId);
      } else {
        onNodeTap(nodeId);
      }
    }
  };

  /* ── SVG pan + pinch ────────────────────────────────── */
  const onSvgPointerDown = (e) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    svgPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (svgPointers.current.size === 1) {
      panRef.current  = { startX: e.clientX, startY: e.clientY, startVB: { ...viewBoxRef.current } };
      pinchRef.current = null;
    } else if (svgPointers.current.size === 2) {
      panRef.current = null;
      const pts  = [...svgPointers.current.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchRef.current = {
        startDist: dist,
        startVB:   { ...viewBoxRef.current },
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
    }
  };

  const onPointerMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;

    // Update tracked SVG pointer
    if (svgPointers.current.has(e.pointerId)) {
      svgPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchRef.current && svgPointers.current.size >= 2) {
      // Pinch zoom
      const pts  = [...svgPointers.current.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = pinchRef.current.startDist / dist; // fingers closer → scale < 1 → zoom in

      const { startVB, midX, midY } = pinchRef.current;
      const rect = svg.getBoundingClientRect();
      const svgMidX = startVB.x + (midX - rect.left) * (startVB.w / rect.width);
      const svgMidY = startVB.y + (midY - rect.top)  * (startVB.h / rect.height);

      const aspect = startVB.h / startVB.w;
      const newW   = Math.max(MIN_VB_W, Math.min(MAX_VB_W, startVB.w * scale));
      const newH   = newW * aspect;
      const newX   = svgMidX - (midX - rect.left) * (newW / rect.width);
      const newY   = svgMidY - (midY - rect.top)  * (newH / rect.height);
      setViewBox({ x: newX, y: newY, w: newW, h: newH });

    } else if (dragging.current) {
      const vb = viewBoxRef.current;
      const dx = (e.clientX - dragging.current.startX) * (vb.w / svg.clientWidth);
      const dy = (e.clientY - dragging.current.startY) * (vb.h / svg.clientHeight);
      onNodeMove(dragging.current.id, dragging.current.nodeX + dx, dragging.current.nodeY + dy);

    } else if (panRef.current) {
      const { startX, startY, startVB } = panRef.current;
      const dx = (e.clientX - startX) * (startVB.w / svg.clientWidth);
      const dy = (e.clientY - startY) * (startVB.h / svg.clientHeight);
      setViewBox({ ...startVB, x: startVB.x - dx, y: startVB.y - dy });
    }
  };

  const onSvgPointerUp = (e) => {
    svgPointers.current.delete(e.pointerId);
    const remaining = svgPointers.current.size;

    if (remaining === 0) {
      const p = panRef.current;
      panRef.current  = null;
      pinchRef.current = null;
      if (!p) return;
      const dx = Math.abs(e.clientX - p.startX);
      const dy = Math.abs(e.clientY - p.startY);
      if (dx < 5 && dy < 5) {
        if (connectingFromId) { onConnect?.(null); return; }
        const { x, y } = toSvgCoords(e.clientX, e.clientY);
        const now  = Date.now();
        const tdx  = Math.abs(e.clientX - lastTap.current.x);
        const tdy  = Math.abs(e.clientY - lastTap.current.y);
        if (now - lastTap.current.time < 300 && tdx < 40 && tdy < 40) {
          lastTap.current = { time: 0, x: 0, y: 0 };
          onCanvasTap(x, y);
        } else {
          lastTap.current = { time: now, x: e.clientX, y: e.clientY };
          onCanvasDeselect?.();
        }
      }
    } else if (remaining === 1) {
      // Transition pinch → pan with remaining finger
      pinchRef.current = null;
      const [pos] = [...svgPointers.current.values()];
      panRef.current = { startX: pos.x, startY: pos.y, startVB: { ...viewBoxRef.current } };
    }
  };

  const vb = viewBox;

  return (
    <svg
      ref={svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={{ width: '100%', height: '100%', background: '#0A0A0A', touchAction: 'none' }}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill="#1E1E1E"/>
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#525252" />
        </marker>
      </defs>

      {/* Dot grid */}
      <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#dots)" style={{ pointerEvents: 'none' }}/>

      {/* Vectors */}
      {(vectors || []).map(v => {
        const from = nodes.find(n => n.id === v.fromId);
        const to   = nodes.find(n => n.id === v.toId);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H / 2;
        const x2 = to.x   + NODE_W / 2, y2 = to.y   + NODE_H / 2;
        return (
          <g key={v.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#525252" strokeWidth={1.5} markerEnd="url(#arrow)" />
            {v.label && (
              <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} fill="#888888" fontSize={11}
                textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">
                {v.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {(nodes || []).map(node => (
        <g
          key={node.id}
          role="button"
          tabIndex={0}
          aria-label={`Nodo ${node.type}: ${node.content || 'sin contenido'}`}
          onPointerDown={e => onNodePointerDown(e, node.id)}
          onPointerUp={e => { e.stopPropagation(); onNodePointerUp(e, node.id); }}
          onKeyDown={e => e.key === 'Enter' && onNodeTap(node.id)}
        >
          <NodeCard
            node={node}
            selected={selectedId === node.id}
            isConnectMode={!!connectingFromId}
            isConnectSource={connectingFromId === node.id}
            onDelete={onDelete ? () => onDelete(node.id) : undefined}
          />
        </g>
      ))}
    </svg>
  );
});

export default ConceptMap;
