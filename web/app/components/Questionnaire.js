'use client';
import { useState, useEffect, useRef } from 'react';
import { simplifyQuestion, autoAnswerQuestions } from '../lib/mcp-client';
import { useIsDesktop } from '../lib/useIsDesktop';
import BrewSpinner from './BrewSpinner';
import { FlowBrand, FlowFooter } from './FlowChrome';

const PAGE_SIZE = 3;

const ICON_SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path d="M7.45284 2.71266C7.8276 1.76244 9.1724 1.76245 9.54716 2.71267L10.7085 5.65732C10.8229 5.94743 11.0526 6.17707 11.3427 6.29148L14.2873 7.45284C15.2376 7.8276 15.2376 9.1724 14.2873 9.54716L11.3427 10.7085C11.0526 10.8229 10.8229 11.0526 10.7085 11.3427L9.54716 14.2873C9.1724 15.2376 7.8276 15.2376 7.45284 14.2873L6.29148 11.3427C6.17707 11.0526 5.94743 10.8229 5.65732 10.7085L2.71266 9.54716C1.76244 9.1724 1.76245 7.8276 2.71267 7.45284L5.65732 6.29148C5.94743 6.17707 6.17707 5.94743 6.29148 5.65732L7.45284 2.71266Z"/><path d="M16.9245 13.3916C17.1305 12.8695 17.8695 12.8695 18.0755 13.3916L18.9761 15.6753C19.039 15.8348 19.1652 15.961 19.3247 16.0239L21.6084 16.9245C22.1305 17.1305 22.1305 17.8695 21.6084 18.0755L19.3247 18.9761C19.1652 19.039 19.039 19.1652 18.9761 19.3247L18.0755 21.6084C17.8695 22.1305 17.1305 22.1305 16.9245 21.6084L16.0239 19.3247C15.961 19.1652 15.8348 19.039 15.6753 18.9761L13.3916 18.0755C12.8695 17.8695 12.8695 17.1305 13.3916 16.9245L15.6753 16.0239C15.8348 15.961 15.961 15.8348 16.0239 15.6753L16.9245 13.3916Z"/></g></svg>';

export default function Questionnaire({ questions, ideaText, onSubmit, onBack, onAnswersChange, initialAnswers = {}, title = 'Preguntas rápidas', error, onClearError, onError }) {
  const isDesktop = useIsDesktop();
  const [answers, setAnswers] = useState(initialAnswers);
  const [simplified, setSimplified] = useState({});   // { [qId]: { text, options } }
  const [simplifying, setSimplifying] = useState({}); // { [qId]: boolean }
  const [answeringAI, setAnsweringAI] = useState({});  // { [qId]: boolean } — IA por pregunta
  const [answeringAllAI, setAnsweringAllAI] = useState(false); // IA para todo el cuestionario
  const [page, setPage] = useState(0);
  const onAnswersChangeRef = useRef(onAnswersChange);
  useEffect(() => { onAnswersChangeRef.current = onAnswersChange; }, [onAnswersChange]);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const pageQuestions = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageAnswered = pageQuestions.filter(q => (answers[q.id]?.length ?? 0) > 0).length;
  const pageComplete = pageQuestions.length > 0 && pageAnswered === pageQuestions.length;
  const isLastPage = page >= totalPages - 1;

  const setAnswer = (qId, indices) => {
    setAnswers(prev => {
      const next = { ...prev, [qId]: indices };
      onAnswersChangeRef.current?.(next);
      return next;
    });
  };

  const toggle = (qId, optIdx, type) => {
    const cur = answers[qId] ?? [];
    if (type === 'single') setAnswer(qId, [optIdx]);
    else {
      const exists = cur.includes(optIdx);
      setAnswer(qId, exists ? cur.filter(i => i !== optIdx) : [...cur, optIdx]);
    }
  };

  const handleSimplify = async (q) => {
    if (simplifying[q.id] || simplified[q.id]) {
      // toggle back to original
      if (simplified[q.id]) {
        setSimplified(prev => { const n = { ...prev }; delete n[q.id]; return n; });
      }
      return;
    }
    setSimplifying(prev => ({ ...prev, [q.id]: true }));
    try {
      const result = await simplifyQuestion(q.text, q.options);
      setSimplified(prev => ({ ...prev, [q.id]: result }));
    } catch {
      // silently fail
    } finally {
      setSimplifying(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleAnswerWithAI = async (q) => {
    if (answeringAI[q.id] || !ideaText) return;
    setAnsweringAI(prev => ({ ...prev, [q.id]: true }));
    try {
      const result = await autoAnswerQuestions(ideaText, [{ id: q.id, text: q.text, type: q.type, options: q.options }]);
      const picked = result.answers?.[q.id];
      if (picked?.length) setAnswer(q.id, picked);
    } catch {
      // silently fail — el usuario puede responder a mano
    } finally {
      setAnsweringAI(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleAnswerAllWithAI = async () => {
    if (answeringAllAI || !ideaText) return;
    const unanswered = questions.filter(q => (answers[q.id]?.length ?? 0) === 0);
    if (unanswered.length === 0) return;
    onClearError?.();
    setAnsweringAllAI(true);
    try {
      const result = await autoAnswerQuestions(ideaText, unanswered.map(q => ({ id: q.id, text: q.text, type: q.type, options: q.options })));
      setAnswers(prev => {
        const next = { ...prev };
        for (const q of unanswered) {
          const picked = result.answers?.[q.id];
          if (picked?.length) next[q.id] = picked;
        }
        onAnswersChangeRef.current?.(next);
        return next;
      });
    } catch (e) {
      onError?.('No se pudo responder con IA. Intenta de nuevo.');
    } finally {
      setAnsweringAllAI(false);
    }
  };

  const answered = questions.filter(q => (answers[q.id]?.length ?? 0) > 0).length;
  const canSubmit = answered === questions.length;

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ fontSize: 10, color: '#525252', marginTop: 1 }}>
            Página {page + 1} de {totalPages} · {answered} de {questions.length} respondidas
          </div>
        </div>
        <FlowBrand />
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: '#1A1A1A', margin: '12px 20px 0', borderRadius: 1, flexShrink: 0 }}>
        <div style={{
          height: '100%', borderRadius: 1, background: '#7c3aed',
          width: `${(answered / questions.length) * 100}%`,
          transition: 'width 300ms',
        }} />
      </div>

      {/* Responder todo con IA */}
      {ideaText && answered < questions.length && (
        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <button
            onClick={handleAnswerAllWithAI}
            disabled={answeringAllAI}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '11px 0', borderRadius: 12, cursor: answeringAllAI ? 'default' : 'pointer',
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
        </div>
      )}

      {/* Questions (page actual) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 0' }}>
        {pageQuestions.map((q) => {
          const qi = questions.indexOf(q);
          const sel = answers[q.id] ?? [];
          const isSimplified = !!simplified[q.id];
          const isLoadingSimplify = !!simplifying[q.id];
          const isLoadingAI = !!answeringAI[q.id];
          const displayText = isSimplified ? simplified[q.id].text : q.text;
          const displayOptions = isSimplified ? simplified[q.id].options : q.options;

          return (
            <div key={q.id} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#E0E0E0', margin: 0, lineHeight: 1.4, flex: 1 }}>
                  <span style={{ color: '#525252', fontWeight: 400, marginRight: 6 }}>{qi + 1}.</span>
                  {displayText}
                  {q.type === 'multi' && (
                    <span style={{ fontSize: 10, color: '#525252', fontWeight: 400, marginLeft: 6 }}>(varias)</span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {ideaText && (
                    <button
                      onClick={() => handleAnswerWithAI(q)}
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
                    onClick={() => handleSimplify(q)}
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
                    <button key={oi} onClick={() => toggle(q.id, oi, q.type)}
                      style={{
                        padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
                        border: `1.5px solid ${active ? '#7c3aed' : '#2A2A2A'}`,
                        background: active ? 'rgba(124,58,237,0.12)' : '#0D0D0D',
                        color: active ? '#E0E0E0' : '#888888',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        transition: 'all 150ms', textAlign: 'left',
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ height: 20 }} />
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid #141414' }}>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 10,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 1.5 }}>{error}</span>
            {onClearError && (
              <button onClick={onClearError}
                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
            )}
          </div>
        )}
        {!pageComplete && !error && (
          <p style={{ fontSize: 12, color: '#525252', margin: '0 0 10px', textAlign: 'center' }}>
            Responde las {pageQuestions.length} preguntas de esta página para continuar
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {page > 0 && (
            <button
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '16px 20px', borderRadius: 14, cursor: 'pointer',
                background: '#161616', border: '1.5px solid #2A2A2A', color: '#E0E0E0',
                fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              }}>
              ← Anterior
            </button>
          )}
          {isLastPage ? (
            <button
              onClick={() => canSubmit && onSubmit(answers)}
              disabled={!canSubmit}
              style={{
                flex: 1, padding: '16px 0',
                background: canSubmit ? '#7c3aed' : '#1A1A1A',
                color: canSubmit ? '#fff' : '#3A3A3A',
                border: `1.5px solid ${canSubmit ? '#7c3aed' : '#2A2A2A'}`,
                borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default',
                transition: 'all 200ms', letterSpacing: '-0.01em',
                boxShadow: canSubmit ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
              }}>
              Evaluar proyecto →
            </button>
          ) : (
            <button
              onClick={() => pageComplete && setPage(p => p + 1)}
              disabled={!pageComplete}
              style={{
                flex: 1, padding: '16px 0',
                background: pageComplete ? '#7c3aed' : '#1A1A1A',
                color: pageComplete ? '#fff' : '#3A3A3A',
                border: `1.5px solid ${pageComplete ? '#7c3aed' : '#2A2A2A'}`,
                borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: pageComplete ? 'pointer' : 'default',
                transition: 'all 200ms', letterSpacing: '-0.01em',
                boxShadow: pageComplete ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
              }}>
              Siguiente →
            </button>
          )}
        </div>
        <FlowFooter />
      </div>
    </div>
    </div>
  );
}
