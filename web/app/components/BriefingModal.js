'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cc_brief_answers';

const QUESTIONS = [
  {
    id: 'platform',
    label: 'Plataforma objetivo',
    type: 'select',
    options: ['Web (browser)', 'iOS', 'Android', 'Desktop (Electron)', 'API / Backend', 'Multi-plataforma'],
  },
  {
    id: 'stack',
    label: 'Stack preferido',
    type: 'select',
    options: ['React / Next.js', 'Vue / Nuxt', 'HTML + CSS + JS vanilla', 'Python / Flask', 'Node.js / Express', 'Sin preferencia (elige tú)'],
  },
  {
    id: 'style',
    label: 'Estilo visual',
    type: 'select',
    options: ['Oscuro y minimalista', 'Claro y limpio', 'Colorido y expresivo', 'Sin preferencia (usa tu criterio)'],
  },
  {
    id: 'constraints',
    label: 'Restricciones clave',
    type: 'text',
    placeholder: 'Ej: sin backend, offline-first, solo lectura, sin auth...',
  },
  {
    id: 'audience',
    label: '¿Para quién es?',
    type: 'text',
    placeholder: 'Ej: usuarios móviles sin experiencia técnica, equipo interno, developers...',
  },
  {
    id: 'success',
    label: '¿Qué hace que este POC sea exitoso?',
    type: 'text',
    placeholder: 'Ej: el usuario puede completar el flujo principal sin instrucciones...',
  },
];

function buildBrief(projectName, nodes, vectors, answers) {
  const nodesSummary = nodes.map(n =>
    `### [${n.type.toUpperCase()}] ${n.content?.slice(0, 120) ?? ''}${n.content?.length > 120 ? '...' : ''}`
  ).join('\n');

  const vectorsSummary = vectors.length > 0
    ? vectors.map(v => {
        const from = nodes.find(n => n.id === v.fromId);
        const to   = nodes.find(n => n.id === v.toId);
        return `- ${from?.content?.slice(0, 40) ?? v.fromId} → ${to?.content?.slice(0, 40) ?? v.toId}`;
      }).join('\n')
    : '(sin conexiones definidas)';

  return `# Brief del proyecto: ${projectName}

## Contexto del mapa de conceptos

${nodesSummary}

### Flujo (vectores)
${vectorsSummary}

## Brief de diseño y desarrollo

**Plataforma objetivo:** ${answers.platform || 'No especificada'}
**Stack:** ${answers.stack || 'A criterio del asistente'}
**Estilo visual:** ${answers.style || 'A criterio del asistente'}
**Restricciones:** ${answers.constraints || 'Ninguna especificada'}
**Audiencia:** ${answers.audience || 'No especificada'}
**Criterio de éxito:** ${answers.success || 'No especificado'}

## Skills activos
- **/ui-ux-pro-max** — aplica en toda interfaz que generes
- **/iconifika** — usa SVGs de Lucide/Phosphor para todos los iconos
`;
}

export default function BriefingModal({ project, nodes, vectors, onClose, onConfirm }) {
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const set = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }));

  const handleConfirm = () => {
    const content = buildBrief(project.name, nodes ?? [], vectors ?? [], answers);
    onConfirm(content);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#141414', border: '1px solid #2A2A2A',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '88svh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#f04e23', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Brief del proyecto
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0' }}>
              Antes de construir
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#525252', cursor: 'pointer',
            fontSize: 22, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <p style={{ fontSize: 13, color: '#888888', marginBottom: 20, lineHeight: 1.6 }}>
          Estas respuestas se incluyen en el contexto que recibe Claude Code. Quedan guardadas para el próximo build.
        </p>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {QUESTIONS.map(q => (
            <div key={q.id}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888888', display: 'block', marginBottom: 6, letterSpacing: '0.02em' }}>
                {q.label}
              </label>
              {q.type === 'select' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => set(q.id, opt)} style={{
                      padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: answers[q.id] === opt ? '#f04e23' : '#2A2A2A',
                      color: answers[q.id] === opt ? '#fff' : '#E0E0E0',
                      fontSize: 12, fontWeight: 500,
                      transition: 'background 150ms',
                    }}>{opt}</button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={e => set(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10,
                    color: '#E0E0E0', padding: '10px 12px', fontSize: 13, resize: 'none',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={handleConfirm} style={{
          marginTop: 24, width: '100%', padding: '14px 0',
          background: '#f04e23', color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(240,78,35,0.35)',
        }}>
          Guardar brief y construir POC
        </button>
      </div>
    </div>
  );
}
