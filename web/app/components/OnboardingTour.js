'use client';
import { useState, useEffect, useCallback } from 'react';

const F = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";

// Tour de inducción — apunta a elementos reales de la UI por selector, uno a la vez.
// Se salta entero si un elemento no está montado (nunca deja un tooltip flotando en el vacío).
export default function OnboardingTour({ steps, onDone }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = steps[stepIndex];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  }, [step]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  // Paso sin elemento montado (timing, layout distinto) — se salta solo, no se traba el tour.
  useEffect(() => {
    if (step && rect === null) {
      const t = setTimeout(() => {
        const el = document.querySelector(step.selector);
        if (!el) advance();
      }, 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, rect]);

  function advance() {
    if (stepIndex >= steps.length - 1) { onDone(); return; }
    setStepIndex(i => i + 1);
  }

  if (!step || !rect) return null;

  const pad = 6;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;

  const spaceBelow = window.innerHeight - rect.bottom;
  const showBelow = spaceBelow > 160 || rect.top < 160;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      {/* Spotlight: anillo transparente con box-shadow gigante que oscurece todo lo demás */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top, left, width, height, borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          border: '2px solid #7c3aed', pointerEvents: 'none',
          transition: 'top 200ms, left 200ms, width 200ms, height 200ms',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: showBelow ? Math.min(top + height + 12, window.innerHeight - 160) : undefined,
          bottom: showBelow ? undefined : window.innerHeight - top + 12,
          left: Math.min(Math.max(left, 16), window.innerWidth - 296),
          width: 280, background: '#181818', border: '1px solid #2A2A2A',
          borderRadius: 14, padding: 16, fontFamily: F,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          {stepIndex + 1} de {steps.length}
        </div>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{step.title}</h4>
        <p style={{ margin: '6px 0 14px', fontSize: 12.5, color: '#A0A0A0', lineHeight: 1.5 }}>{step.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={onDone}
            style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', padding: '6px 4px' }}>
            Saltar tour
          </button>
          <button
            onClick={advance}
            style={{
              background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 12.5, fontWeight: 700, padding: '8px 16px', cursor: 'pointer',
            }}>
            {stepIndex >= steps.length - 1 ? 'Entendido' : 'Siguiente →'}
          </button>
        </div>
      </div>
      <style>{`@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }`}</style>
    </div>
  );
}
