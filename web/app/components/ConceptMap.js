'use client';
import { useRef, useState } from 'react';
import NodeCard from './NodeCard';

const NODE_W = 180;
const NODE_H = 90;

export default function ConceptMap({ nodes, vectors, selectedId, onNodeTap, onCanvasTap, onNodeMove }) {
  const svgRef = useRef(null);
  const dragging = useRef(null); // { id, startX, startY, nodeX, nodeY }
  const [viewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });

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
    const svg = svgRef.current;
    if (!svg) return;
    const dx = (e.clientX - dragging.current.startX) * (viewBox.w / svg.clientWidth);
    const dy = (e.clientY - dragging.current.startY) * (viewBox.h / svg.clientHeight);
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
      {(vectors || []).map(v => {
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
      {(nodes || []).map(node => (
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
