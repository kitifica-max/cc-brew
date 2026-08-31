'use client';
import { useState, useRef, useEffect } from 'react';
import { refineIdea, simplifyQuestion, autoAnswerQuestions } from '../lib/mcp-client';
import { useIsDesktop } from '../lib/useIsDesktop';
import BrewSpinner from './BrewSpinner';
import { FlowBrand, FlowFooter } from './FlowChrome';

const ICON_SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path d="M7.45284 2.71266C7.8276 1.76244 9.1724 1.76245 9.54716 2.71267L10.7085 5.65732C10.8229 5.94743 11.0526 6.17707 11.3427 6.29148L14.2873 7.45284C15.2376 7.8276 15.2376 9.1724 14.2873 9.54716L11.3427 10.7085C11.0526 10.8229 10.8229 11.0526 10.7085 11.3427L9.54716 14.2873C9.1724 15.2376 7.8276 15.2376 7.45284 14.2873L6.29148 11.3427C6.17707 11.0526 5.94743 10.8229 5.65732 10.7085L2.71266 9.54716C1.76244 9.1724 1.76245 7.8276 2.71267 7.45284L5.65732 6.29148C5.94743 6.17707 6.17707 5.94743 6.29148 5.65732L7.45284 2.71266Z"/><path d="M16.9245 13.3916C17.1305 12.8695 17.8695 12.8695 18.0755 13.3916L18.9761 15.6753C19.039 15.8348 19.1652 15.961 19.3247 16.0239L21.6084 16.9245C22.1305 17.1305 22.1305 17.8695 21.6084 18.0755L19.3247 18.9761C19.1652 19.039 19.039 19.1652 18.9761 19.3247L18.0755 21.6084C17.8695 22.1305 17.1305 22.1305 16.9245 21.6084L16.0239 19.3247C15.961 19.1652 15.8348 19.039 15.6753 18.9761L13.3916 18.0755C12.8695 17.8695 12.8695 17.1305 13.3916 16.9245L15.6753 16.0239C15.8348 15.961 15.961 15.8348 16.0239 15.6753L16.9245 13.3916Z"/></g></svg>';

// Claves alineadas con SEMAFORO_PROMPT (mcp/netlify/functions/ai-process.mjs) — ver también
// el landing (#sema-grid) y SKILL.md, que usan esta misma nomenclatura del pivote a CC Brew.
const CRITERIOS = [
  { key: 'claridad_objecion',     label: 'Claridad de la objeción',   blocking: true  },
  { key: 'alcance_v1',            label: 'Alcance de la herramienta', blocking: true  },
  { key: 'recorrido_cliente',     label: 'Recorrido del cliente',     blocking: false },
  { key: 'dependencias_externas', label: 'Dependencias externas',     blocking: false },
  { key: 'coherencia',            label: 'Coherencia',                blocking: false },
  { key: 'viabilidad',            label: 'Viabilidad',                blocking: false },
];

const COLORS = { 0: '#EF4444', 1: '#F59E0B', 2: '#10B981' };
const LABELS = { 0: 'No cumple', 1: 'Parcial', 2: 'Cumple' };
const BLOCKING_KEYS = CRITERIOS.filter(c => c.blocking).map(c => c.key);

// Compartido con page.js — así el conteo de rondas bloqueadas y la UI de acá
// usan exactamente el mismo criterio de "bloqueado".
export function isSemaforoBlocked(semaforo) {
  return BLOCKING_KEYS.some(k => semaforo[k] === 0);
}

export default function SemaforoView({ semaforo, onGenerate, onBack, onStartOver, loading, ideaText, previousAnswers, initialFollowupAnswers = {}, onFollowupAnswersChange, blockedRounds = 0, maxRefineRounds = 2 }) {
  const isDesktop = useIsDesktop();
  const [followupAnswers, setFollowupAnswers] = useState(initialFollowupAnswers);
  const [refinedFollowups, setRefinedFollowups] = useState(null);
  const [refineLoading, setRefineLoading] = useState(false);
  const onFollowupAnswersChangeRef = useRef(onFollowupAnswersChange);
  useEffect(() => { onFollowupAnswersChangeRef.current = onFollowupAnswersChange; }, [onFollowupAnswersChange]);
  const [simplified, setSimplified] = useState({});   // { [qId]: { text, options } }
  const [simplifying, setSimplifying] = useState({}); // { [qId]: boolean }
  const [answeringAI, setAnsweringAI] = useState({});  // { [qId]: boolean } — IA por pregunta
  const [answeringAllAI, setAnsweringAllAI] = useState(false); // IA para todo el seguimiento
  const [aiError, setAiError] = useState(null);

  const followupQs = refinedFollowups ?? semaforo.followup_questions ?? [];
  const hasFollowups = followupQs.length > 0;
  const allFollowupsAnswered = followupQs.every(q => (followupAnswers[q.id]?.length ?? 0) > 0);

  const handleRefine = async () => {
    if (!ideaText || refineLoading) return;
    setRefineLoading(true);
    try {
      const blockingList = blocking.map(c => ({ key: c.key, label: c.label, msg: semaforo.mensajes?.[c.key] ?? '' }));
      // Incluye lo ya respondido en rondas previas de seguimiento — si no, la
      // segunda ronda de "mejorar mis respuestas" pierde ese contexto y puede
      // volver a preguntar algo que el usuario ya resolvió.
      const mergedPrevious = { ...previousAnswers, ...followupAnswers };
      const result = await refineIdea(ideaText, blockingList, mergedPrevious);
      if (result.followup_questions?.length) {
        setRefinedFollowups(result.followup_questions);
        setFollowupAnswers({});
        onFollowupAnswersChangeRef.current?.({});
        setSimplified({});
      }
    } catch {}
    setRefineLoading(false);
  };

  const blocking = CRITERIOS.filter(c => c.blocking && semaforo[c.key] === 0);
  const isBlocked = isSemaforoBlocked(semaforo);
  const refineRoundsLeft = blockedRounds < maxRefineRounds;

  const setFollowupAnswer = (qId, indices) => {
    setFollowupAnswers(prev => {
      const next = { ...prev, [qId]: indices };
      onFollowupAnswersChangeRef.current?.(next);
      return next;
    });
  };

  const toggleFollowup = (qId, optIdx, type) => {
    const cur = followupAnswers[qId] ?? [];
    if (type === 'single') setFollowupAnswer(qId, [optIdx]);
    else {
      const exists = cur.includes(optIdx);
      setFollowupAnswer(qId, exists ? cur.filter(i => i !== optIdx) : [...cur, optIdx]);
    }
  };

  const handleSimplifyFollowup = async (q) => {
    if (simplifying[q.id] || simplified[q.id]) {
      if (simplified[q.id]) setSimplified(prev => { const n = { ...prev }; delete n[q.id]; return n; });
      return;
    }
    setSimplifying(prev => ({ ...prev, [q.id]: true }));
    try {
      const result = await simplifyQuestion(q.text, q.options ?? []);
      setSimplified(prev => ({ ...prev, [q.id]: result }));
    } catch {
      // silently fail
    } finally {
      setSimplifying(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleAnswerFollowupWithAI = async (q) => {
    if (answeringAI[q.id] || !ideaText) return;
    setAnsweringAI(prev => ({ ...prev, [q.id]: true }));
    try {
      const result = await autoAnswerQuestions(ideaText, [{ id: q.id, text: q.text, type: q.type ?? 'single', options: q.options ?? [] }]);
      const picked = result.answers?.[q.id];
      if (picked?.length) setFollowupAnswer(q.id, picked);
    } catch {
      // silently fail — el usuario puede responder a mano
    } finally {
      setAnsweringAI(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleAnswerAllFollowupsWithAI = async () => {
    if (answeringAllAI || !ideaText) return;
    const unanswered = followupQs.filter(q => (followupAnswers[q.id]?.length ?? 0) === 0);
    if (unanswered.length === 0) return;
    setAiError(null);
    setAnsweringAllAI(true);
    try {
      const result = await autoAnswerQuestions(
        ideaText,
        unanswered.map(q => ({ id: q.id, text: q.text, type: q.type ?? 'single', options: q.options ?? [] }))
      );
      setFollowupAnswers(prev => {
        const next = { ...prev };
        for (const q of unanswered) {
          const picked = result.answers?.[q.id];
          if (picked?.length) next[q.id] = picked;
        }
        onFollowupAnswersChangeRef.current?.(next);
        return next;
      });
    } catch {
      setAiError('No se pudo responder con IA. Intenta de nuevo.');
    } finally {
      setAnsweringAllAI(false);
    }
  };

  const viabilidadMsg = {
    2: 'Viable directo', 1: '≈ 1-2 días', 0: 'Revisar alcance — demasiado grande',
  }[semaforo.viabilidad ?? 1];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'center' : 'stretch',
      padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)',
    }}>
    <div style={{ width: '100%', maxWidth: isDesktop ? 640 : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                   justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>Revisión del proyecto</div>
          <div style={{ fontSize: 10, color: '#525252', marginTop: 1 }}>Viabilidad: {viabilidadMsg}</div>
        </div>
        <FlowBrand />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {CRITERIOS.map(({ key, label, blocking: isBlockingCriteria }) => {
          const score = semaforo[key] ?? 0;
          const msg   = semaforo.mensajes?.[key] ?? '';
          return (
            <div key={key} style={{
              marginBottom: 12, borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${score === 0 ? 'rgba(239,68,68,0.3)' : score === 1 ? 'rgba(245,158,11,0.2)' : '#1E1E1E'}`,
              background: score === 0 ? 'rgba(239,68,68,0.05)' : '#0D0D0D',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[score], flexShrink: 0, boxShadow: `0 0 0 3px ${COLORS[score]}22` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0' }}>{label}</span>
                    {isBlockingCriteria && (
                      <span style={{ fontSize: 9, color: '#525252', background: '#1A1A1A', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>REQUERIDO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS[score], marginTop: 2 }}>
                    {LABELS[score]}{msg ? ` — ${msg}` : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Follow-up questions */}
        {hasFollowups && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: '#525252', margin: '0 0 14px', lineHeight: 1.5 }}>
              Responde para mejorar el resultado:
            </p>

            {ideaText && !allFollowupsAnswered && (
              <button
                onClick={handleAnswerAllFollowupsWithAI}
                disabled={answeringAllAI}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px 0', marginBottom: 18, borderRadius: 12, cursor: answeringAllAI ? 'default' : 'pointer',
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
                  color: '#7c3aed', fontSize: 13, fontWeight: 700, opacity: answeringAllAI ? 0.6 : 1,
                  transition: 'opacity 150ms',
                }}>
                {answeringAllAI ? (
                  <BrewSpinner size={15} />
                ) : (
                  <span aria-hidden="true" style={{ width: 13, height: 13, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: ICON_SPARK }} />
                )}
                {answeringAllAI ? 'Respondiendo...' : 'Responder todo con IA'}
              </button>
            )}
            {aiError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 16,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 1.5 }}>{aiError}</span>
                <button onClick={() => setAiError(null)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
              </div>
            )}

            {followupQs.map((q) => {
              const sel = followupAnswers[q.id] ?? [];
              const isSimplified = !!simplified[q.id];
              const isLoadingSimplify = !!simplifying[q.id];
              const isLoadingAI = !!answeringAI[q.id];
              const displayText = isSimplified ? simplified[q.id].text : q.text;
              const displayOptions = isSimplified ? simplified[q.id].options : (q.options ?? []);

              return (
                <div key={q.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0', margin: 0, lineHeight: 1.4, flex: 1 }}>
                      {displayText}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {ideaText && (
                        <button
                          onClick={() => handleAnswerFollowupWithAI(q)}
                          disabled={isLoadingAI}
                          title="Responder esta pregunta con IA"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 8px', borderRadius: 6, cursor: isLoadingAI ? 'default' : 'pointer',
                            background: 'transparent', border: '1px solid #2A2A2A',
                            color: '#7c3aed', fontSize: 10, fontWeight: 500, transition: 'all 150ms',
                            opacity: isLoadingAI ? 0.5 : 1,
                          }}>
                          {isLoadingAI ? (
                            <BrewSpinner size={11} />
                          ) : <span aria-hidden="true" style={{ width: 10, height: 10, display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: ICON_SPARK }} />}
                          {isLoadingAI ? '' : 'IA'}
                        </button>
                      )}
                      <button
                        onClick={() => handleSimplifyFollowup(q)}
                        disabled={isLoadingSimplify}
                        title={isSimplified ? 'Ver original' : 'Simplificar pregunta'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 8px', borderRadius: 6, cursor: isLoadingSimplify ? 'default' : 'pointer',
                          background: isSimplified ? 'rgba(124,58,237,0.08)' : 'transparent',
                          border: `1px solid ${isSimplified ? 'rgba(124,58,237,0.25)' : '#2A2A2A'}`,
                          color: isSimplified ? '#7c3aed' : '#444',
                          fontSize: 10, fontWeight: 500, transition: 'all 150ms',
                          opacity: isLoadingSimplify ? 0.5 : 1,
                        }}>
                        {isLoadingSimplify ? (
                          <BrewSpinner size={11} />
                        ) : isSimplified ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M9 14l-4-4 4-4M15 10H5M15 10l4 4-4 4"/>
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                          </svg>
                        )}
                        {isLoadingSimplify ? '' : isSimplified ? 'Original' : 'Simplificar'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {displayOptions.map((opt, oi) => {
                      const active = sel.includes(oi);
                      return (
                        <button key={oi} onClick={() => toggleFollowup(q.id, oi, q.type ?? 'single')}
                          style={{
                            padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                            border: `1.5px solid ${active ? '#7c3aed' : '#2A2A2A'}`,
                            background: active ? 'rgba(124,58,237,0.12)' : '#0D0D0D',
                            color: active ? '#E0E0E0' : '#888888',
                            fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 150ms',
                          }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid #141414' }}>
        {isBlocked && refineRoundsLeft && (
          <>
            <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 10px', textAlign: 'center', lineHeight: 1.4 }}>
              Falta: {blocking.map(c => c.label).join(', ')}
            </p>
            <button
              onClick={handleRefine}
              disabled={refineLoading}
              style={{
                width: '100%', padding: '12px 0', marginBottom: 10,
                background: refineLoading ? '#1A1A1A' : 'rgba(124,58,237,0.1)',
                color: refineLoading ? '#3A3A3A' : '#7c3aed',
                border: '1.5px solid rgba(124,58,237,0.3)',
                borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: refineLoading ? 'default' : 'pointer', transition: 'all 200ms',
              }}>
              {refineLoading ? 'Generando preguntas...' : hasFollowups ? 'Generar otras preguntas →' : 'Mejorar mis respuestas →'}
            </button>
          </>
        )}
        {isBlocked && !refineRoundsLeft && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 10,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', margin: '0 0 6px' }}>
              Esta idea necesita un cambio más grande del que unas preguntas pueden resolver
            </p>
            <p style={{ fontSize: 12, color: '#888888', margin: '0 0 12px', lineHeight: 1.5 }}>
              Ya lo intentamos {maxRefineRounds} {maxRefineRounds === 1 ? 'vez' : 'veces'} y sigue faltando: {blocking.map(c => c.label).join(', ')}. Mejor volvé a escribirla desde cero, más específica.
            </p>
            <button onClick={onStartOver}
              style={{
                width: '100%', padding: '12px 0', background: '#7c3aed', border: 'none',
                borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              Reescribir mi idea →
            </button>
          </div>
        )}
        {!isBlocked && hasFollowups && !allFollowupsAnswered && (
          <p style={{ fontSize: 12, color: '#F59E0B', margin: '0 0 10px', textAlign: 'center' }}>
            Responde las preguntas de seguimiento para mejor resultado
          </p>
        )}
        {(!isBlocked || refineRoundsLeft) && (
          <button
            onClick={() => canSubmit() && onGenerate(hasFollowups && Object.keys(followupAnswers).length > 0 ? followupAnswers : null)}
            disabled={loading || (isBlocked && !allFollowupsAnswered)}
            style={{
              width: '100%', padding: '16px 0',
              background: (isBlocked && !allFollowupsAnswered) ? '#1A1A1A' : '#7c3aed',
              color: (isBlocked && !allFollowupsAnswered) ? '#3A3A3A' : '#fff',
              border: `1.5px solid ${(isBlocked && !allFollowupsAnswered) ? '#2A2A2A' : '#7c3aed'}`,
              borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: (isBlocked && !allFollowupsAnswered) || loading ? 'default' : 'pointer',
              transition: 'all 200ms', letterSpacing: '-0.01em',
              boxShadow: (isBlocked && !allFollowupsAnswered) ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
            }}>
            {loading ? 'Generando documento...' : isBlocked ? 'Revisar mis respuestas →' : 'Generar CLAUDE.md →'}
          </button>
        )}
        <FlowFooter />
      </div>
    </div>
    </div>
  );

  function canSubmit() {
    return !loading && (!isBlocked || allFollowupsAnswered);
  }
}
