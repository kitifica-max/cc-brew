'use client';

const TYPE_LABELS = {
  conversation: 'Conversación',
  reference:    'Referencia',
  definition:   'Definición',
  process:      'Proceso',
  design:       'Diseño',
};

const TYPE_COLORS = {
  conversation: '#7c3aed',
  reference:    '#3B82F6',
  definition:   '#8B5CF6',
  process:      '#10B981',
  design:       '#EC4899',
};

const NODE_W = 180;
const NODE_H = 90;

export default function NodeCard({ node, selected, onDelete, isConnectMode, isConnectSource }) {
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{
        cursor: isConnectMode && !isConnectSource ? 'crosshair' : 'pointer',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
      }}
    >
      {/* Connect target ring */}
      {isConnectMode && !isConnectSource && (
        <rect width={NODE_W} height={NODE_H} rx={12}
          fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.65}/>
      )}
      {/* Connect source highlight */}
      {isConnectSource && (
        <rect width={NODE_W} height={NODE_H} rx={12}
          fill="rgba(124,58,237,0.08)" stroke="#7c3aed" strokeWidth={3} opacity={0.9}/>
      )}

      <rect
        width={NODE_W} height={NODE_H} rx={12}
        fill={selected ? 'rgba(124,58,237,0.18)' : '#1C1C1C'}
        stroke={selected ? '#7c3aed' : '#2A2A2A'}
        strokeWidth={selected ? 3 : 1.5}
      />
      <rect width={NODE_W} height={2.5} rx={1} fill={TYPE_COLORS[node.type] ?? '#444'} opacity={0.75}/>
      <text x={10} y={18} fill={TYPE_COLORS[node.type] ?? '#888888'} fontSize={11} fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif">
        {TYPE_LABELS[node.type] ?? node.type}
      </text>
      <foreignObject x={10} y={24} width={NODE_W - 20} height={NODE_H - 30}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ fontSize: 12, color: '#E0E0E0', fontFamily: 'system-ui, -apple-system, sans-serif',
                   overflow: 'hidden', display: '-webkit-box',
                   WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                   whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {node.aiContent || node.content || '...'}
        </div>
      </foreignObject>

      {/* Delete × (visible when selected + not in connect mode) */}
      {selected && !isConnectMode && onDelete && (
        <g
          transform={`translate(${NODE_W - 14}, 14)`}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => { e.stopPropagation(); onDelete(); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={11} fill="#0A0A0A" stroke="#2A2A2A" strokeWidth={1.5}/>
          <text textAnchor="middle" dominantBaseline="central"
            fill="#888888" fontSize={14} fontWeight="700">×</text>
        </g>
      )}
    </g>
  );
}

export { NODE_W, NODE_H };
