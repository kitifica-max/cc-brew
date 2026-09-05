'use client';
import { useState, useRef, useEffect } from 'react';
import { useIsDesktop } from '../lib/useIsDesktop';
import { FlowBrand, FlowFooter } from './FlowChrome';

const CRITERIOS = [
  { key: 'problem_clarity', label: 'Claridad del problema' },
  { key: 'target_audience', label: 'Público definido' },
  { key: 'value_proposition', label: 'Propuesta de valor' },
  { key: 'competition', label: 'Competencia y diferenciación' },
  { key: 'feasibility', label: 'Factibilidad técnica' },
  { key: 'monetization', label: 'Monetización' },
  { key: 'mvp_scope', label: 'Alcance del MVP' },
  { key: 'distribution', label: 'Distribución' },
  { key: 'timing', label: 'Timing' },
  { key: 'founder_fit', label: 'Fit del fundador' },
];

const SIGNAL_STYLES = {
  strong: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', label: 'Fuerte' },
  moderate: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#F59E0B', label: 'Moderada' },
  weak: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#EF4444', label: 'Débil' },
  unknown: { bg: 'rgba(115,115,115,0.12)', border: 'rgba(115,115,115,0.3)', color: '#737373', label: 'Sin dato' },
};

const DECISION_STYLES = {
  BUILD: { bg: '#22c55e', label: 'BUILD', sub: 'Construilo' },
  RETHINK: { bg: '#F59E0B', label: 'RETHINK', sub: 'Repensala' },
  DON_T_BUILD: { bg: '#EF4444', label: "DON'T BUILD", sub: 'Dejala ir' },
};

function SignalBadge({ signal }) {
  const s = SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: '0.03em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  );
}

export default function BuildDecision({ decision, onAction, onBack, ideaText, previousAnswers, blockedRounds }) {
  const isDesktop = useIsDesktop();
  const [showRethinkForm, setShowRethinkForm] = useState(false);
  const [rethinkAnswers, setRethinkAnswers] = useState({});
  const [expandedCriterion, setExpandedCriterion] = useState(null);

  if (!decision) return null;

  const { decision: decisionType, why, strongest_signal, biggest_risk, what_would_change, criteria, before_you_build, v1_scope, dont_build_yet } = decision;
  const dStyle = DECISION_STYLES[decisionType] ?? DECISION_STYLES.RETHINK;

  const handleRethink = () => {
    onAction('RETHINK', rethinkAnswers);
  };

  const handleDontBuild = () => {
    onAction('DON_T_BUILD');
  };

  const handleBuild = () => {
    onAction('BUILD');
  };

  const handleStartOver = () => {
    onAction('START_OVER');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'center' : 'stretch',
      padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ width: '100%', maxWidth: isDesktop ? 640 : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, flexShrink: 0 }}>
          <button onClick={onBack} aria-label="Volver"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                     justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Decisión
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#525252' }}>10 criterios evaluados</span>
            </div>
          </div>
          <FlowBrand />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 16px' }}>
          <div style={{
            background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
              background: `${dStyle.bg}11`, borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: dStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 16px ${dStyle.bg}44`,
              }}>
                {decisionType === 'BUILD' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
                {decisionType === 'RETHINK' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M1 4v6h6M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                )}
                {decisionType === 'DON_T_BUILD' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M4.93 4.93l14.14 14.14"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: dStyle.bg, letterSpacing: '-0.02em' }}>
                  {dStyle.label}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {dStyle.sub}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#A0A0A0', margin: 0, lineHeight: 1.6 }}>
                {why}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {strongest_signal && (
              <div style={{
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Señal más fuerte
                </div>
                <div style={{ fontSize: 13, color: '#E0E0E0', lineHeight: 1.5 }}>
                  {strongest_signal}
                </div>
              </div>
            )}

            {biggest_risk && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Riesgo más grande
                </div>
                <div style={{ fontSize: 13, color: '#E0E0E0', lineHeight: 1.5 }}>
                  {biggest_risk}
                </div>
              </div>
            )}

            {what_would_change && (
              <div style={{
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Qué cambiaría nuestra opinión
                </div>
                <div style={{ fontSize: 13, color: '#E0E0E0', lineHeight: 1.5 }}>
                  {what_would_change}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
              10 Criterios
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CRITERIOS.map(c => {
                const criterion = criteria?.[c.key];
                const signal = criterion?.signal ?? 'unknown';
                const isExpanded = expandedCriterion === c.key;
                return (
                  <div key={c.key} style={{
                    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setExpandedCriterion(isExpanded ? null : c.key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <SignalBadge signal={signal} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#E0E0E0' }}>
                        {c.label}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2" strokeLinecap="round"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {isExpanded && criterion?.reason && (
                      <div style={{ padding: '0 16px 12px', fontSize: 12, color: '#A0A0A0', lineHeight: 1.5 }}>
                        {criterion.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {decisionType === 'BUILD' && before_you_build && (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 12, padding: '16px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                Antes de construir
              </div>
              <p style={{ fontSize: 13, color: '#A0A0A0', margin: 0, lineHeight: 1.6 }}>
                {before_you_build}
              </p>
              {v1_scope && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                    V1
                  </div>
                  <p style={{ fontSize: 12, color: '#A0A0A0', margin: 0, lineHeight: 1.5 }}>
                    {v1_scope}
                  </p>
                </div>
              )}
            </div>
          )}

          {decisionType === 'DON_T_BUILD' && dont_build_yet && (
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 12, padding: '16px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                No construir todavía
              </div>
              <p style={{ fontSize: 13, color: '#A0A0A0', margin: 0, lineHeight: 1.6 }}>
                {dont_build_yet}
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
          {decisionType === 'RETHINK' && !showRethinkForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setShowRethinkForm(true)}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#F59E0B', color: '#000',
                  border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                }}>
                Re-evaluar con nueva info →
              </button>
              <button onClick={handleStartOver}
                style={{
                  width: '100%', padding: '12px 0', background: 'none',
                  border: '1px solid #2A2A2A', borderRadius: 14, fontSize: 13, fontWeight: 600,
                  color: '#888', cursor: 'pointer',
                }}>
                Empezar con otra idea
              </button>
            </div>
          )}

          {decisionType === 'RETHINK' && showRethinkForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={rethinkAnswers.additional_info ?? ''}
                onChange={e => setRethinkAnswers({ additional_info: e.target.value })}
                placeholder="Contanos qué más sabés que pueda cambiar la evaluación..."
                style={{
                  width: '100%', minHeight: 100, resize: 'none', boxSizing: 'border-box',
                  background: '#111111', border: '1.5px solid #2A2A2A', borderRadius: 12,
                  padding: '12px', color: '#E0E0E0', fontSize: 14, lineHeight: 1.5,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleRethink}
                disabled={!rethinkAnswers.additional_info?.trim()}
                style={{
                  width: '100%', padding: '14px 0',
                  background: rethinkAnswers.additional_info?.trim() ? '#F59E0B' : '#1A1A1A',
                  color: rethinkAnswers.additional_info?.trim() ? '#000' : '#3A3A3A',
                  border: `1.5px solid ${rethinkAnswers.additional_info?.trim() ? '#F59E0B' : '#2A2A2A'}`,
                  borderRadius: 14, fontSize: 15, fontWeight: 700,
                  cursor: rethinkAnswers.additional_info?.trim() ? 'pointer' : 'default',
                }}>
                Re-evaluar →
              </button>
              <button onClick={() => setShowRethinkForm(false)}
                style={{
                  width: '100%', padding: '10px 0', background: 'none',
                  border: 'none', fontSize: 12, color: '#525252', cursor: 'pointer',
                }}>
                Cancelar
              </button>
            </div>
          )}

          {decisionType === 'BUILD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleBuild}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#22c55e', color: '#000',
                  border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}>
                Generar Brief →
              </button>
              <button onClick={handleStartOver}
                style={{
                  width: '100%', padding: '12px 0', background: 'none',
                  border: '1px solid #2A2A2A', borderRadius: 14, fontSize: 13, fontWeight: 600,
                  color: '#888', cursor: 'pointer',
                }}>
                Evaluar otra idea
              </button>
            </div>
          )}

          {decisionType === 'DON_T_BUILD' && (
            <button onClick={handleStartOver}
              style={{
                width: '100%', padding: '14px 0', background: '#1A1A1A',
                border: '1px solid #2A2A2A', borderRadius: 14, fontSize: 15, fontWeight: 700,
                color: '#E0E0E0', cursor: 'pointer',
              }}>
              Evaluar otra idea
            </button>
          )}

          <FlowFooter />
        </div>
      </div>
    </div>
  );
}
