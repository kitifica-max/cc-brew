'use client';

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

export { NODE_W, NODE_H };
