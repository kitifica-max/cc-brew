'use client';
import { useRef, useState } from 'react';
import NodeCard from './NodeCard';

const NODE_W = 180;
const NODE_H = 90;

export default function ConceptMap({ nodes, vectors, selectedId, onNodeTap, onCanvasTap, onCanvasDeselect, onNodeMove }) {
  const svgRef = useRef(null);
  const dragging = useRef(null); // { id, startX, startY, nodeX, nodeY }
  const panRef = useRef(null);   // { startX, startY, startVB }
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
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

  const onNodePointerDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragging.current = { id: nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const onSvgPointerDown = (e) => {
    panRef.current = { startX: e.clientX, startY: e.clientY, startVB: { ...viewBox } };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    if (dragging.current) {
      const dx = (e.clientX - dragging.current.startX) * (viewBox.w / svg.clientWidth);
      const dy = (e.clientY - dragging.current.startY) * (viewBox.h / svg.clientHeight);
      onNodeMove(dragging.current.id, dragging.current.nodeX + dx, dragging.current.nodeY + dy);
    } else if (panRef.current) {
      const dx = (e.clientX - panRef.current.startX) * (panRef.current.startVB.w / svg.clientWidth);
      const dy = (e.clientY - panRef.current.startY) * (panRef.current.startVB.h / svg.clientHeight);
      setViewBox({ ...panRef.current.startVB, x: panRef.current.startVB.x - dx, y: panRef.current.startVB.y - dy });
    }
  };

  const onNodePointerUp = (e, nodeId) => {
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    const dx = Math.abs(e.clientX - d.startX);
    const dy = Math.abs(e.clientY - d.startY);
    if (dx < 5 && dy < 5) onNodeTap(nodeId);
  };

  const onSvgPointerUp = (e) => {
    const p = panRef.current;
    panRef.current = null;
    if (!p) return;
    const dx = Math.abs(e.clientX - p.startX);
    const dy = Math.abs(e.clientY - p.startY);
    if (dx < 5 && dy < 5) {
      const { x, y } = toSvgCoords(e.clientX, e.clientY);
      const now = Date.now();
      const tdx = Math.abs(e.clientX - lastTap.current.x);
      const tdy = Math.abs(e.clientY - lastTap.current.y);
      if (now - lastTap.current.time < 300 && tdx < 40 && tdy < 40) {
        lastTap.current = { time: 0, x: 0, y: 0 };
        onCanvasTap(x, y);
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
        onCanvasDeselect?.();
      }
    }
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      style={{ width: '100%', height: '100%', background: '#0F172A', touchAction: 'none' }}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#64748B" />
        </marker>
      </defs>
      {(vectors || []).map(v => {
        const from = nodes.find(n => n.id === v.fromId);
        const to   = nodes.find(n => n.id === v.toId);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H / 2;
        const x2 = to.x   + NODE_W / 2, y2 = to.y   + NODE_H / 2;
        return (
          <g key={v.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#64748B" strokeWidth={1.5} markerEnd="url(#arrow)" />
            {v.label && (
              <text x={(x1+x2)/2} y={(y1+y2)/2 - 6} fill="#94A3B8" fontSize={11}
                textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">
                {v.label}
              </text>
            )}
          </g>
        );
      })}
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
          <NodeCard node={node} selected={selectedId === node.id} onTap={onNodeTap} />
        </g>
      ))}
    </svg>
  );
}
