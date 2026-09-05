'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import IdeaCapture from './components/IdeaCapture';
import Questionnaire from './components/Questionnaire';
import BuildDecision from './components/BuildDecision';
import BuildBrief from './components/BuildBrief';
import SettingsPanel from './components/SettingsPanel';
import OnboardingTour from './components/OnboardingTour';
import BrewSpinner from './components/BrewSpinner';
import BuyMinutes from './components/BuyMinutes';
import { useIsDesktop } from './lib/useIsDesktop';
import {
  generateQuestionnaire,
  evaluateIdea,
  describeImages,
} from './lib/mcp-client';
import {
  loadProjects, saveProjects, makeProject,
} from './lib/storage';
import { fetchProjects, upsertProject, deleteProjectFromDb, fetchAudienceProfiles, saveAudienceProfileToLibrary, fetchOnboardingSeen, markOnboardingSeen, fetchUserCredits } from './lib/projects-db';

const ONBOARDING_STEPS = [
  { selector: '#onb-new-project', title: 'Empezá acá', body: 'Contanos tu idea y te decimos si vale la pena construirla.' },
  { selector: '#onb-drawer-btn', title: 'Tus evaluaciones', body: 'Acá están todas tus ideas evaluadas. Volvé a cualquiera cuando quieras.' },
  { selector: '#onb-settings-btn', title: 'Créditos y Claude Code', body: 'Acá ves tu saldo de créditos y comprás más cuando haga falta.' },
];

function LoadingScreen({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
    }}>
      <div style={{ filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.7))' }}>
        <BrewSpinner size={250} />
      </div>
      <p style={{ fontSize: 13, color: '#525252', margin: 0, textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
        {message}
      </p>
    </div>
  );
}

export default function Home() {
  const isDesktop = useIsDesktop();
  const [projects, setProjects] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [screen, setScreen] = useState(null);
  // 'idea' | 'loading' | 'interrogation' | 'evaluating' | 'decision' | 'generating_brief' | 'brief'

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [docSaveStatus, setDocSaveStatus] = useState('saved');
  const [userCredits, setUserCredits] = useState(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(null);
  const [audienceProfiles, setAudienceProfiles] = useState([]);
  const [decision, setDecision] = useState(null);
  const [blockedRounds, setBlockedRounds] = useState(0);

  const currentIdRef = useRef(null);
  const projectsRef = useRef([]);
  const syncTimers = useRef({});
  const didLoadCloudRef = useRef(false);
  const lastCloudFetchRef = useRef(0);
  const [syncingProjects, setSyncingProjects] = useState(false);

  const loadCloudProjects = useCallback(async () => {
    lastCloudFetchRef.current = Date.now();
    setSyncingProjects(true);
    const dbProjects = await fetchProjects();
    setSyncingProjects(false);
    if (dbProjects === null) {
      setProjects(loadProjects());
      return;
    }
    const local = loadProjects();
    const remoteIds = new Set(dbProjects.map(p => p.id));
    const localOnly = local.filter(p => !remoteIds.has(p.id));
    setProjects([...dbProjects, ...localOnly]);
    localOnly.forEach(p => upsertProject(p));
  }, []);

  useEffect(() => {
    function loadForSession() {
      if (didLoadCloudRef.current) return;
      didLoadCloudRef.current = true;
      loadCloudProjects();
      fetchOnboardingSeen().then(seen => setOnboardingSeen(seen));
      fetchUserCredits().then(credits => setUserCredits(credits));
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadForSession();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) loadForSession();
    });

    function onVisible() {
      if (document.visibilityState === 'visible' && didLoadCloudRef.current && Date.now() - lastCloudFetchRef.current > 10000) {
        loadCloudProjects();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadCloudProjects]);

  const handleOnboardingDone = useCallback(() => {
    setOnboardingSeen(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) markOnboardingSeen(data.user.id);
    });
  }, []);

  const replayOnboarding = useCallback(() => {
    setOnboardingSeen(false);
  }, []);

  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const currentProject = projects.find(p => p.id === currentId) ?? null;

  const syncDebounced = useCallback((id) => {
    clearTimeout(syncTimers.current[id]);
    syncTimers.current[id] = setTimeout(() => {
      const p = projectsRef.current.find(pr => pr.id === id);
      if (p) upsertProject(p);
    }, 1500);
  }, []);

  const patchProject = useCallback((id, patch, opts) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    if (opts?.immediate) {
      clearTimeout(syncTimers.current[id]);
      const p = projectsRef.current.find(pr => pr.id === id);
      if (p) return upsertProject({ ...p, ...patch });
    } else {
      syncDebounced(id);
    }
  }, [syncDebounced]);

  const saveBrief = useCallback(async (id, patch) => {
    setDocSaveStatus('saving');
    const result = await patchProject(id, patch, { immediate: true });
    setDocSaveStatus(result?.ok === false ? 'error' : 'saved');
  }, [patchProject]);

  const selectProject = (id) => {
    setCurrentId(id);
    setDrawerOpen(false);
    const p = projects.find(pr => pr.id === id);
    if (!p) return;
    setError(null);
    setDecision(p.decision ?? null);
    if (p.brief && p.decision?.decision === 'BUILD') {
      setScreen('brief');
      setDocSaveStatus('saved');
      setQuestions([]);
      setAnswers(null);
    } else if (p.decision) {
      setScreen('decision');
      setAnswers(p.pendingAnswers ?? null);
    } else if (p.pendingQuestions?.length) {
      setQuestions(p.pendingQuestions);
      setAnswers(p.pendingAnswers ?? null);
      setScreen('interrogation');
    } else {
      setScreen('idea');
      setQuestions([]);
      setAnswers(null);
    }
  };

  const createNewProject = (name) => {
    const p = makeProject(name);
    setProjects(prev => [p, ...prev]);
    upsertProject(p);
    setCurrentId(p.id);
    setDrawerOpen(false);
    setScreen('idea');
    setError(null);
  };

  const descontarCredito = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc('descontar_minuto', { p_user_id: user.id });
    if (error) console.error('descontar_credito failed:', error.message);
    fetchUserCredits().then(credits => setUserCredits(credits));
  };

  const handleIdeaSubmit = async (ideaText, images = []) => {
    setError(null);
    setBlockedRounds(0);
    patchProject(currentId, { ideaText });
    setScreen('loading');
    setLoadingMsg('Analizando tu idea...');
    try {
      let effectiveText = ideaText;
      if (images.length > 0) {
        setLoadingMsg('Analizando tus referencias visuales...');
        const { visual_references } = await describeImages(ideaText, images);
        if (visual_references) {
          effectiveText = `${ideaText}\n\nReferencias visuales adjuntas:\n${visual_references}`;
          patchProject(currentId, { ideaText: effectiveText });
        }
      }
      fetchAudienceProfiles().then(setAudienceProfiles);
      setLoadingMsg('Generando preguntas personalizadas...');
      const result = await generateQuestionnaire(effectiveText, null, null, 'idea');
      const qs = result.questions ?? [];
      setQuestions(qs);
      patchProject(currentId, { pendingQuestions: qs, pendingAnswers: {} });
      setScreen('interrogation');
    } catch (e) {
      setError(e.message);
      setScreen('idea');
    }
  };

  const handleAnswersSubmit = async (ans) => {
    setError(null);
    setAnswers(ans);
    patchProject(currentId, { pendingAnswers: ans });
    setScreen('evaluating');
    setLoadingMsg('Evaluando tu idea... puede tardar un minuto.');
    try {
      const result = await evaluateIdea(currentId, currentProject.ideaText, ans, null, null, null, 'idea');
      if (!result.decision) throw new Error('Respuesta inválida del servidor. Intenta de nuevo.');
      setDecision(result.decision);
      saveBrief(currentId, {
        brief: result.brief,
        decision: result.decision,
        pendingQuestions: null,
      });
      descontarCredito();
      setScreen('decision');
    } catch (e) {
      setError(e.message);
      setScreen('interrogation');
    }
  };

  const handleQuestionnaireAnswerChange = useCallback((ans) => {
    patchProject(currentId, { pendingAnswers: ans });
  }, [currentId, patchProject]);

  const handleDecisionAction = async (action, followupAnswers) => {
    setError(null);
    if (action === 'BUILD') {
      setScreen('brief');
      patchProject(currentId, { documentConfirmed: true, pendingAnswers: null }, { immediate: true });
    } else if (action === 'RETHINK' && followupAnswers) {
      setScreen('evaluating');
      setLoadingMsg('Re-evaluando con nueva información...');
      try {
        const result = await evaluateIdea(currentId, currentProject.ideaText, answers, followupAnswers, null, null, 'idea');
        setDecision(result.decision);
        saveBrief(currentId, {
          brief: result.brief,
          decision: result.decision,
          pendingAnswers: null,
        });
        setScreen('decision');
      } catch (e) {
        setError(e.message);
        setScreen('decision');
      }
    } else if (action === 'DON_T_BUILD') {
      patchProject(currentId, { decision: { ...decision, decision: 'DON_T_BUILD' }, pendingAnswers: null }, { immediate: true });
      setScreen(null);
      setCurrentId(null);
      setDrawerOpen(true);
    } else if (action === 'START_OVER') {
      setScreen('idea');
      setQuestions([]);
      setAnswers(null);
      setDecision(null);
      setBlockedRounds(0);
      patchProject(currentId, { pendingQuestions: null, pendingAnswers: null });
    }
  };

  const renderScreen = () => {
    if (!currentId || screen === null) {
      const trialCount = userCredits?.trialCredits ?? 3;
      const evalsCount = userCredits?.minutesBalance ?? 0;
      const isByo = !!userCredits?.byoApiActive;

      let creditsBadgeText = 'Cargando balance...';
      if (userCredits) {
        if (isByo) {
          creditsBadgeText = 'Evaluaciones ilimitadas activas';
        } else if (trialCount > 0) {
          creditsBadgeText = `Tenés ${trialCount} ${trialCount === 1 ? 'evaluación de prueba gratis' : 'evaluaciones de prueba gratis'}`;
        } else if (evalsCount > 0) {
          creditsBadgeText = `Tenés ${evalsCount} ${evalsCount === 1 ? 'crédito disponible' : 'créditos disponibles'}`;
        } else {
          creditsBadgeText = '0 evaluaciones de prueba restantes';
        }
      } else {
        creditsBadgeText = 'Tenés 3 evaluaciones de prueba gratis';
      }

      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: '100%', flexDirection: 'column',
          padding: 'calc(env(safe-area-inset-top, 20px) + 50px) 20px calc(env(safe-area-inset-bottom, 20px) + 16px)',
          boxSizing: 'border-box', overflowY: 'auto', textAlign: 'center',
        }}>
          <div style={{ flex: 1, minHeight: 0 }} />

          <div style={{
            width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: isDesktop ? 20 : 16,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#c4b5fd',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isByo ? '#8B5CF6' : (trialCount > 0 ? '#22c55e' : '#737373'),
                  boxShadow: (isByo || trialCount > 0) ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }} />
                <span>{creditsBadgeText}</span>
              </div>

              <h2 style={{
                fontSize: isDesktop ? 24 : 21, fontWeight: 800, color: '#FFFFFF',
                letterSpacing: '-0.03em', margin: '2px 0 0', lineHeight: 1.25,
              }}>
                ¿Vale la pena construir tu idea?
              </h2>

              <p style={{
                fontSize: 13, color: '#888888', lineHeight: 1.5,
                margin: 0, maxWidth: 360,
              }}>
                Evaluamos tu idea antes de que gastes tiempo y dinero. Te decimos si construirla, replantearla o dejarla.
              </p>
            </div>

            <button
              id="onb-new-project"
              onClick={() => { setDrawerOpen(true); }}
              style={{
                width: '100%', maxWidth: 340, padding: '14px 24px',
                background: '#7c3aed', color: '#fff', border: 'none',
                borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
              onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Nueva evaluación</span>
            </button>

            <div style={{
              width: '100%', maxWidth: 360,
              background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden', textAlign: 'left',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.12)',
              marginTop: 4,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 13px', background: '#1A1A1A', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '0.02em' }}>Decisión</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: '#22c55e', background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6,
                  padding: '2px 7px', textTransform: 'uppercase',
                }}>
                  Señales claras ✓
                </span>
              </div>

              <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'monospace' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F3F4F6' }}>
                  BUILD / RETHINK / DON'T BUILD
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#A1A1AA', marginTop: 2 }}>
                  10 criterios evaluados
                </div>
                <div style={{ fontSize: 9.5, color: '#71717A', lineHeight: 1.4 }}>
                  Red team, señales fuertes, riesgos y qué cambiaría la decisión.
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                padding: '7px 10px', background: 'rgba(255,255,255,0.02)',
                borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: '#737373',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>En 3 minutos</span>
                </div>
                <span>·</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                  <span>Señales, no puntaje</span>
                </div>
                <span>·</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Honesto, no motivador</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1, minHeight: 48,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingTop: 20,
          }}>
            <button
              onClick={() => setBuyModalOpen(true)}
              style={{
                background: 'none', border: 'none', padding: '6px 12px',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                color: '#666666', cursor: 'pointer', transition: 'color 0.15s ease',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
              onMouseLeave={e => e.currentTarget.style.color = '#666666'}
            >
              ¿Necesitas más evaluaciones? Explora los planes →
            </button>
          </div>
        </div>
      );
    }

    if (screen === 'idea') return (
      <IdeaCapture
        projectName={currentProject?.name ?? ''}
        initialText={currentProject?.ideaText ?? ''}
        onSubmit={handleIdeaSubmit}
        onBack={() => { setCurrentId(null); setScreen(null); setDrawerOpen(true); }}
        error={error}
        onClearError={() => setError(null)}
      />
    );

    if (screen === 'loading' || screen === 'evaluating' || screen === 'generating_brief') return (
      <LoadingScreen message={loadingMsg} />
    );

    if (screen === 'interrogation') return (
      <Questionnaire
        questions={questions}
        title={currentProject?.name}
        ideaText={currentProject?.ideaText}
        initialAnswers={currentProject?.pendingAnswers ?? {}}
        onSubmit={handleAnswersSubmit}
        onAnswersChange={handleQuestionnaireAnswerChange}
        onBack={() => setScreen('idea')}
        error={error}
        onClearError={() => setError(null)}
        onError={setError}
      />
    );

    if (screen === 'decision' && decision) return (
      <BuildDecision
        decision={decision}
        onAction={handleDecisionAction}
        onBack={() => setScreen('interrogation')}
        ideaText={currentProject?.ideaText}
        previousAnswers={answers}
        blockedRounds={blockedRounds}
      />
    );

    if (screen === 'brief' && currentProject?.brief) return (
      <BuildBrief
        brief={currentProject.brief}
        projectName={currentProject.name}
        decision={currentProject.decision}
        onNew={() => createNewProject()}
        onClose={() => { setCurrentId(null); setScreen(null); setDrawerOpen(true); }}
        saveStatus={docSaveStatus}
        onRetrySave={() => saveBrief(currentId, { brief: currentProject.brief, decision: currentProject.decision })}
      />
    );

    return null;
  };

  return (
    <AuthGate>
      <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0A0A0A', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%)',
        }} />
        {renderScreen()}

        {(screen === null) && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: 'calc(env(safe-area-inset-top, 20px) + 12px) 16px 12px',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(to bottom, rgba(10,10,10,0.88) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}>
            <button
              id="onb-drawer-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir evaluaciones"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E0E0E0" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            </button>
            <div style={{ flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProject?.name ?? 'CC Brew'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6' }} />
                <span style={{ fontSize: 10, color: '#525252' }}>IA de Kitifica</span>
              </div>
            </div>
            <button onClick={replayOnboarding} aria-label="Ver guía"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <button id="onb-settings-btn" onClick={() => setSettingsOpen(true)} aria-label="Configuración"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        )}

        {error && screen !== 'idea' && screen !== 'interrogation' && (
          <div style={{
            position: 'fixed', bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
            left: isDesktop ? '50%' : 16, right: isDesktop ? undefined : 16,
            transform: isDesktop ? 'translateX(-50%)' : undefined,
            width: isDesktop ? 'min(480px, calc(100vw - 48px))' : undefined,
            zIndex: 200,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ fontSize: 12, color: '#EF4444', flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>
        )}

        {drawerOpen && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex' }}>
            <div onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{ position: 'relative', zIndex: 51, width: 'min(310px, calc(100vw - 56px))', height: '100%', flexShrink: 0 }}>
              <ProjectsList
                projects={projects}
                currentId={currentId}
                onSwitch={selectProject}
                onCreate={createNewProject}
                onDelete={id => {
                  setProjects(prev => prev.filter(p => p.id !== id));
                  deleteProjectFromDb(id);
                  if (currentId === id) { setCurrentId(null); setScreen(null); }
                  setDrawerOpen(false);
                }}
                onRename={(id, name) => {
                  setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
                  syncDebounced(id);
                }}
                onShowSettings={() => { setDrawerOpen(false); setSettingsOpen(true); }}
                onRefresh={loadCloudProjects}
                refreshing={syncingProjects}
              />
            </div>
          </div>
        )}

        {settingsOpen && (
          <SettingsPanel
            onClose={() => { setSettingsOpen(false); fetchUserCredits().then(credits => setUserCredits(credits)); }}
            onReplayOnboarding={replayOnboarding}
          />
        )}

        {buyModalOpen && (
          <BuyMinutes
            initialPack="creador"
            onClose={() => {
              setBuyModalOpen(false);
              fetchUserCredits().then(credits => setUserCredits(credits));
            }}
            onSuccess={() => {
              setBuyModalOpen(false);
              fetchUserCredits().then(credits => setUserCredits(credits));
            }}
          />
        )}

        {screen === null && !onboardingSeen && (
          <OnboardingTour steps={ONBOARDING_STEPS} onDone={handleOnboardingDone} />
        )}
      </div>
    </AuthGate>
  );
}
