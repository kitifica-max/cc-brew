'use client';

const TYPE_LABELS = {
  conversation: 'Conversación',
  reference:    'Referencia',
  definition:   'Definición',
  process:      'Proceso',
};

const NODE_W = 180;
const NODE_H = 90;

export default function NodeCard({ node, selected, onTap }) {
  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: 'pointer', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
    >
      <rect
        width={NODE_W} height={NODE_H} rx={12}
        fill={selected ? 'rgba(240,78,35,0.18)' : '#243147'}
        stroke={selected ? '#f04e23' : '#334155'}
        strokeWidth={selected ? 3 : 2}
      />
      <text x={10} y={18} fill="#94A3B8" fontSize={11} fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">
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
    </g>
  );
}

export { NODE_W, NODE_H };
