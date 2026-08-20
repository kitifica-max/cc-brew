'use client';

const TYPE_LABELS = {
  conversation: 'Conversación',
  reference:    'Referencia',
  definition:   'Definición',
  process:      'Proceso',
};

const NODE_W = 180;
const NODE_H = 90;

export default function NodeCard({ node, selected, onDelete, isConnectMode, isConnectSource }) {
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{
        cursor: isConnectMode && !isConnectSource ? 'crosshair' : 'pointer',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
      }}
    >
      {/* Connect target ring */}
      {isConnectMode && !isConnectSource && (
        <rect width={NODE_W} height={NODE_H} rx={12}
          fill="none" stroke="#f04e23" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.65}/>
      )}
      {/* Connect source highlight */}
      {isConnectSource && (
        <rect width={NODE_W} height={NODE_H} rx={12}
          fill="rgba(240,78,35,0.08)" stroke="#f04e23" strokeWidth={3} opacity={0.9}/>
      )}

      <rect
        width={NODE_W} height={NODE_H} rx={12}
        fill={selected ? 'rgba(240,78,35,0.18)' : '#243147'}
        stroke={selected ? '#f04e23' : '#334155'}
        strokeWidth={selected ? 3 : 2}
      />
      <text x={10} y={18} fill="#94A3B8" fontSize={11} fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif">
        {TYPE_LABELS[node.type] ?? node.type}
      </text>
      <foreignObject x={10} y={24} width={NODE_W - 20} height={NODE_H - 30}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'system-ui, -apple-system, sans-serif',
                   overflow: 'hidden', display: '-webkit-box',
                   WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {node.aiContent || node.content || '...'}
        </div>
      </foreignObject>

      {/* Delete ×  (visible when selected + not in connect mode) */}
      {selected && !isConnectMode && onDelete && (
        <g
          transform={`translate(${NODE_W - 14}, 14)`}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => { e.stopPropagation(); onDelete(); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={11} fill="#0F172A" stroke="#475569" strokeWidth={1.5}/>
          <text textAnchor="middle" dominantBaseline="central"
            fill="#94A3B8" fontSize={14} fontWeight="700">×</text>
        </g>
      )}
    </g>
  );
}

export { NODE_W, NODE_H };
