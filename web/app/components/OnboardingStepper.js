'use client';
import { useState, useEffect, useMemo } from 'react';

const TYPE_BADGE = {
  conversation: 'Conversación',
  definition:   'Definición',
  reference:    'Referencia',
  process:      'Proceso',
};

function buildSteps(project) {
  const nodes   = project?.nodes   ?? [];
  const vectors = project?.vectors ?? [];
  return [
    {
      id:     1,
      title:  'Describe tu idea',
      detail: 'Crea un nodo Conversación y cuéntale tu idea al asistente. Él te hace preguntas para estructurar el POC.',
      type:   'conversation',
      done:   nodes.some(n => n.type === 'conversation' && n.content?.trim()),
    },
    {
      id:     2,
      title:  'Define el alcance',
      detail: 'Añade un nodo Definición para delimitar qué incluye tu POC y qué queda fuera. Sé específico.',
      type:   'definition',
      done:   nodes.some(n => n.type === 'definition' && n.content?.trim()),
    },
    {
      id:     3,
      title:  'Agrega referencias',
      detail: 'Nodo Referencia: adjunta archivos, URLs o documentos que la IA necesita conocer para generar el proyecto.',
      type:   'reference',
      done:   nodes.some(n => n.type === 'reference' && n.content?.trim()),
    },
    {
      id:     4,
      title:  'Mapea el flujo',
      detail: 'Nodo Proceso: describe paso a paso cómo funcionará tu solución de inicio a fin.',
      type:   'process',
      done:   nodes.some(n => n.type === 'process' && n.content?.trim()),
    },
    {
      id:     5,
      title:  'Conecta los nodos',
      detail: 'Selecciona un nodo, toca "Conectar →" en el editor y luego toca otro nodo. Las flechas muestran el flujo de información.',
      done:   vectors.length > 0,
    },
    {
      id:     6,
      title:  'Construye el POC',
      detail: 'Presiona el botón naranja "Construir POC". Claude Code recibirá todo el contexto de tu mapa y generará el proyecto.',
      done:   false,
    },
  ];
}

export default function OnboardingStepper({ project }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start true to avoid flash

  const storageKey = `cc_stepper_${project?.id}`;

  useEffect(() => {
    if (!project?.id) return;
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  const steps        = useMemo(() => buildSteps(project), [project]);
  const done         = steps.filter(s => s.done).length;
  const currentStep  = steps.find(s => !s.done) ?? steps[steps.length - 1];

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  if (dismissed || !project) return null;

  /* ── collapsed chip ──────────────────────────────────── */
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label="Abrir guía paso a paso"
        style={{
          position: 'fixed',
          bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
          right: 16, zIndex: 20,
          background: '#141414', border: '1px solid #2A2A2A',
          borderRadius: 20, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f04e23' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#E0E0E0', whiteSpace: 'nowrap' }}>
          Guía · Paso {Math.min(currentStep.id, steps.length)}/{steps.length}
        </span>
      </button>
    );
  }

  /* ── expanded panel ──────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
      right: 16, zIndex: 20,
      width: 264,
      background: '#141414', border: '1px solid #2A2A2A',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '11px 14px', borderBottom: '1px solid #2A2A2A',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', flex: 1 }}>
          Cómo armar tu POC
        </span>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Colapsar guía"
          style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer',
                   fontSize: 20, lineHeight: 1, padding: '0 6px' }}>
          −
        </button>
        <button
          onClick={dismiss}
          aria-label="Cerrar guía"
          style={{ background: 'none', border: 'none', color: '#525252', cursor: 'pointer',
                   fontSize: 18, lineHeight: 1, padding: '0 0 0 2px' }}>
          ×
        </button>
      </div>

      {/* Steps list */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {steps.map(step => {
          const isCurrent = step.id === currentStep.id;
          return (
            <div key={step.id} style={{
              display: 'flex', gap: 10, padding: '9px 14px',
              background: isCurrent ? 'rgba(240,78,35,0.06)' : 'transparent',
              borderLeft: `2px solid ${isCurrent ? '#f04e23' : 'transparent'}`,
            }}>

              {/* Circle indicator */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step.done ? '#f04e23' : isCurrent ? 'rgba(240,78,35,0.15)' : '#1C1C1C',
                border: `1.5px solid ${step.done ? '#f04e23' : isCurrent ? '#f04e23' : '#2A2A2A'}`,
                transition: 'all 300ms',
              }}>
                {step.done ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? '#f04e23' : '#525252' }}>
                    {step.id}
                  </span>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: step.done ? '#525252' : isCurrent ? '#E0E0E0' : '#737373',
                    textDecoration: step.done ? 'line-through' : 'none',
                  }}>
                    {step.title}
                  </span>
                  {step.type && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
                      background: isCurrent && !step.done ? 'rgba(240,78,35,0.15)' : '#1C1C1C',
                      color: isCurrent && !step.done ? '#f04e23' : '#525252',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {TYPE_BADGE[step.type]}
                    </span>
                  )}
                </div>
                {isCurrent && !step.done && (
                  <p style={{
                    fontSize: 11, color: '#737373', margin: '4px 0 0',
                    lineHeight: 1.55, fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #2A2A2A' }}>
        <div style={{ height: 3, background: '#2A2A2A', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: '#f04e23', borderRadius: 2,
            width: `${(done / steps.length) * 100}%`,
            transition: 'width 400ms ease',
          }} />
        </div>
        <div style={{ fontSize: 10, color: '#525252', marginTop: 5, textAlign: 'right' }}>
          {done}/{steps.length} pasos
        </div>
      </div>
    </div>
  );
}
