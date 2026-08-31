'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthGate from './components/AuthGate';
import ProjectsList from './components/ProjectsList';
import ConceptMap from './components/ConceptMap';
import NodeEditor from './components/NodeEditor';
import IdeaCapture from './components/IdeaCapture';
import ContextCapture from './components/ContextCapture';
import Questionnaire from './components/Questionnaire';
import SemaforoView, { isSemaforoBlocked } from './components/SemaforoView';
import DocumentViewer from './components/DocumentViewer';
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
  loadProjects, saveProjects, makeProject, makeNode, makeVector,
} from './lib/storage';
import { fetchProjects, upsertProject, deleteProjectFromDb, fetchAudienceProfiles, saveAudienceProfileToLibrary, fetchOnboardingSeen, markOnboardingSeen, fetchUserCredits } from './lib/projects-db';

const ONBOARDING_STEPS = [
  { selector: '#onb-new-project', title: 'Empezá acá', body: 'Tocá para arrancar un proyecto — le contás tu idea a la IA y arma todo el resto.' },
  { selector: '#onb-drawer-btn', title: 'Tus proyectos', body: 'Acá están todos tus proyectos guardados. Volvé a cualquiera cuando quieras.' },
  { selector: '#onb-settings-btn', title: 'Créditos y Claude Code', body: 'Acá conectás Claude Code, ves tu saldo de créditos y comprás más cuando haga falta.' },
];

// Tope de rondas de "mejorar mis respuestas" para una idea que sigue
// bloqueada — evita dejar a alguien dando vueltas en una idea sin arreglo.
const MAX_REFINE_ROUNDS = 2;

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
  // 'capture' | 'loading' | 'questionnaire' | 'evaluating' | 'semaforo' | 'generating_doc' | 'document' | 'canvas'

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true); // true por default: nunca se muestra de más mientras carga
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [docSaveStatus, setDocSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [userCredits, setUserCredits] = useState(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  // Flow state (not persisted between sessions, only claudeMd saved to project)
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(null);
  const [audienceProfiles, setAudienceProfiles] = useState([]);
  const [semaforo, setSemaforo] = useState(null);
  const [blockedRounds, setBlockedRounds] = useState(0);

  // Canvas state
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [connectingFromId, setConnectingFromId] = useState(null);
  const currentIdRef = useRef(null);
  const connectingRef = useRef(null);
  const mapRef = useRef(null);
  const projectsRef = useRef([]);
  const syncTimers = useRef({});
  const didLoadCloudRef = useRef(false);
  const lastCloudFetchRef = useRef(0);
  const [syncingProjects, setSyncingProjects] = useState(false);

  // Home monta antes de que AuthGate resuelva la sesión (AuthGate es un hijo
  // de este mismo árbol, no un wrapper externo) — un efecto con deps [] que
  // dispara fetchProjects() al montar corre con el cliente todavía anónimo la
  // primera vez que alguien inicia sesión de forma interactiva, y la request
  // vuelve vacía por RLS sin reintentar nunca. Se engancha a la sesión real
  // (getSession al montar + onAuthStateChange) en vez del mount en sí.
  // También sirve como refresh manual (botón en ProjectsList) — por eso vive
  // en un useCallback propio en vez de metida adentro del efecto de abajo.
  const loadCloudProjects = useCallback(async () => {
    lastCloudFetchRef.current = Date.now();
    setSyncingProjects(true);
    const dbProjects = await fetchProjects();
    setSyncingProjects(false);
    if (dbProjects === null) {
      // Falló el fetch (red, sesión vencida, RLS) — usar local como fallback
      // sin tocar la nube. Nunca se pisa lo remoto con un resultado de error.
      setProjects(loadProjects());
      return;
    }
    // Merge, no reemplazo: "la nube volvió vacía" NO implica "usuario nuevo" —
    // puede ser un dispositivo nuevo con datos reales ya en otro lado. Se
    // combinan ambas fuentes por id; lo que solo existe en local (creado
    // offline o antes de la primera sync) se sube, nunca se descarta en
    // silencio ninguno de los dos lados.
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

    // Un PWA instalado no remontea al pasar a background — puede quedar vivo
    // en memoria por horas. Sin esto, un dispositivo que ya estaba abierto
    // nunca se entera de cambios hechos en otro (ej. CLAUDE.md generado en
    // desktop) hasta que lo cierran y reabren del todo. Re-sync al volver a
    // primer plano, con piso de 10s para no golpear la red en cada alt-tab.
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

  // Re-mostrar el tour a pedido desde Ajustes — no toca el flag persistido en
  // la nube; si el usuario no lo termina, la próxima sesión sigue sin mostrarlo solo.
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

  // Guarda el CLAUDE.md al toque (sin esperar el debounce de 1.5s) — el
  // caso de uso típico es cerrar la app apenas se ve el resultado.
  const saveClaudeMd = useCallback(async (id, patch) => {
    setDocSaveStatus('saving');
    const result = await patchProject(id, patch, { immediate: true });
    setDocSaveStatus(result?.ok === false ? 'error' : 'saved');
  }, [patchProject]);

  // Canvas ops
  const updateNode = useCallback((nodeId, patch) => {
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : {
        ...p, nodes: p.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n),
      }
    ));
  }, []);

  const addNode = useCallback((type, x, y) => {
    const node = makeNode(type, x, y);
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : { ...p, nodes: [...p.nodes, node] }
    ));
    return node;
  }, []);

  const addVector = useCallback((fromId, toId, label = '') => {
    const vector = makeVector(fromId, toId, label);
    setProjects(prev => prev.map(p =>
      p.id !== currentIdRef.current ? p : { ...p, vectors: [...p.vectors, vector] }
    ));
  }, []);

  const handleConnect = useCallback((toId) => {
    const fromId = connectingRef.current;
    if (toId && fromId) addVector(fromId, toId);
    connectingRef.current = null;
    setConnectingFromId(null);
  }, [addVector]);

  // Project selection
  const selectProject = (id) => {
    setCurrentId(id);
    setDrawerOpen(false);
    const p = projects.find(pr => pr.id === id);
    if (!p) return;
    setError(null);
    setSemaforo(p.semaforo ?? null);
    // Si hay follow-ups del semáforo sin confirmar, no saltar al documento
    // "final" — volver a la revisión para no perder esa oportunidad de mejora.
    const hasPendingFollowups = !!p.semaforo?.followup_questions?.length && !p.documentConfirmed;
    if (p.claudeMd && hasPendingFollowups) {
      setScreen('semaforo');
      setAnswers(p.pendingAnswers ?? null);
    } else if (p.claudeMd) {
      setScreen('document');
      setDocSaveStatus('saved');
      setQuestions([]);
      setAnswers(null);
    } else if (p.pendingQuestions?.length) {
      setQuestions(p.pendingQuestions);
      setAnswers(p.pendingAnswers ?? null);
      setScreen('questionnaire');
    } else {
      setScreen('capture');
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
    setScreen('capture');
    setError(null);
  };

  // Flow: IdeaCapture → contexto (público objetivo + marca) → questionnaire
  // mode ('idea' | 'problema') viaja con el proyecto y condiciona el encuadre
  // del cuestionario, el semáforo y el CLAUDE.md final.
  const handleIdeaSubmit = async (ideaText, images = [], mode = 'idea') => {
    setError(null);
    setBlockedRounds(0);
    patchProject(currentId, { ideaText, ideaMode: mode });
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
      setScreen('context');
    } catch (e) {
      setError(e.message);
      setScreen('capture');
    }
  };

  const generateQuestionnaireFor = async (ideaText, audienceProfile, brandProfile) => {
    setScreen('loading');
    setLoadingMsg('Generando preguntas personalizadas...');
    try {
      const result = await generateQuestionnaire(ideaText, audienceProfile, brandProfile, currentProject?.ideaMode ?? 'idea');
      const qs = result.questions ?? [];
      setQuestions(qs);
      patchProject(currentId, {
        pendingQuestions: qs, pendingAnswers: {},
        audienceProfile: audienceProfile ?? null,
        brandProfile: brandProfile ?? null,
      });
      setScreen('questionnaire');
    } catch (e) {
      setError(e.message);
      setScreen('capture');
    }
  };

  // Flow: ContextCapture → questionnaire (enriquecido con público objetivo + marca)
  const handleContextSubmit = async (context) => {
    if (context.error) { setError(context.error); setScreen('capture'); return; }
    setError(null);
    const { audience, clientProfileRaw, audienceProfileId, audienceName, brandProfile } = context;

    if (audience && !audienceProfileId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) saveAudienceProfileToLibrary(user.id, { name: audienceName, roleLevel: audience.role_level, painPoint: audience.pain_point, objection: audience.objection, successSignal: audience.success_signal, buyingStage: audience.buying_stage, channel: audience.channel });
    }

    patchProject(currentId, { clientProfile: clientProfileRaw ?? null, audienceProfileId: audienceProfileId ?? null });
    const effectiveIdea = currentProject?.ideaText ?? '';
    const resolvedAudience = audience ?? (clientProfileRaw ? { raw_text: clientProfileRaw } : null);
    await generateQuestionnaireFor(effectiveIdea, resolvedAudience, brandProfile);
  };

  const handleContextSkip = async () => {
    setError(null);
    const effectiveIdea = currentProject?.ideaText ?? '';
    await generateQuestionnaireFor(effectiveIdea, null, null);
  };

  // Flow: Questionnaire → evaluation
  // Cobra el crédito acá — es el único momento en que un CLAUDE.md nuevo queda
  // guardado para el proyecto. handleGenerate (más abajo) solo navega/mejora
  // texto y NO vuelve a cobrar, para que "1 crédito = 1 proyecto" sea real
  // sin importar cuántas veces se reabra o se pida un follow-up.
  const handleAnswersSubmit = async (ans) => {
    setError(null);
    setAnswers(ans);
    patchProject(currentId, { pendingAnswers: ans });
    setScreen('evaluating');
    setLoadingMsg('Evaluando tu proyecto... puede tardar un minuto.');
    try {
      const result = await evaluateIdea(currentId, currentProject.ideaText, ans, null, currentProject?.audienceProfile, currentProject?.brandProfile, currentProject?.ideaMode ?? 'idea');
      if (!result.semaforo) throw new Error('Respuesta inválida del servidor. Intenta de nuevo.');
      setSemaforo(result.semaforo);
      const hasFollowups = !!result.semaforo.followup_questions?.length;
      // pendingAnswers se conserva (no se limpia acá) si hay follow-ups —
      // hace falta para poder volver a esta pantalla si el usuario cierra
      // la app antes de decidir qué hacer con ellos. Se limpia recién en
      // handleGenerate, cuando el usuario ya tomó esa decisión.
      saveClaudeMd(currentId, {
        claudeMd: result.claude_md,
        semaforo: result.semaforo,
        pendingQuestions: null,
        documentConfirmed: !hasFollowups,
      });
      descontarMinuto();
      setScreen('semaforo');
    } catch (e) {
      setError(e.message);
      setScreen('questionnaire');
    }
  };

  const handleQuestionnaireAnswerChange = useCallback((ans) => {
    patchProject(currentId, { pendingAnswers: ans });
  }, [currentId, patchProject]);

  const handleFollowupAnswersChange = useCallback((ans) => {
    patchProject(currentId, { pendingFollowupAnswers: ans });
  }, [currentId, patchProject]);

  const descontarMinuto = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc('descontar_minuto', { p_user_id: user.id });
    if (error) console.error('descontar_minuto failed:', error.message);
    fetchUserCredits().then(credits => setUserCredits(credits));
  };

  // Flow: SemaforoView → generate document (with optional followup answers)
  // No cobra acá — el crédito ya se cobró en handleAnswersSubmit. Un follow-up
  // solo mejora el mismo CLAUDE.md del mismo proyecto.
  const handleGenerate = async (followupAnswers) => {
    setError(null);
    if (followupAnswers) {
      setScreen('generating_doc');
      setLoadingMsg('Revisando tus respuestas... puede tardar un minuto.');
      try {
        const result = await evaluateIdea(currentId, currentProject.ideaText, answers, followupAnswers, currentProject?.audienceProfile, currentProject?.brandProfile, currentProject?.ideaMode ?? 'idea');
        setSemaforo(result.semaforo);
        if (isSemaforoBlocked(result.semaforo)) {
          // Sigue sin resolver lo bloqueante — cuenta como una ronda de
          // refinamiento gastada. Hay un tope (MAX_REFINE_ROUNDS) para no
          // dejar a alguien dando vueltas en una idea que no tiene arreglo
          // con más preguntas; SemaforoView muestra el mensaje de cierre solo
          // cuando se agota.
          setBlockedRounds(r => r + 1);
          patchProject(currentId, { pendingFollowupAnswers: null, semaforo: result.semaforo });
          setScreen('semaforo');
          return;
        }
        saveClaudeMd(currentId, {
          claudeMd: result.claude_md,
          semaforo: result.semaforo,
          documentConfirmed: true,
          pendingAnswers: null,
          pendingFollowupAnswers: null,
        });
        setScreen('document');
      } catch (e) {
        setError(e.message);
        setScreen('semaforo');
      }
    } else {
      patchProject(currentId, { documentConfirmed: true, pendingAnswers: null, pendingFollowupAnswers: null }, { immediate: true });
      setScreen('document');
    }
  };

  // Flow: SemaforoView (idea agotó sus rondas de refinamiento) → vuelve a
  // capturar la idea desde cero, mismo proyecto y mismo crédito ya cobrado.
  const handleStartOver = () => {
    setScreen('capture');
    setQuestions([]);
    setAnswers(null);
    setSemaforo(null);
    setBlockedRounds(0);
    patchProject(currentId, { pendingQuestions: null, pendingAnswers: null, pendingFollowupAnswers: null });
  };

  // Build nodes from claudeMd (for canvas view)
  const buildNodesFromDocument = (md) => {
    const lines = md.split('\n');
    const nodes = [];
    const vectors = [];
    let lastId = null;
    let x = 60, y = 80;
    const types = { '## ': 'definition', '### ': 'process', '- ': 'reference' };

    for (const line of lines) {
      let type = null, content = line.trim();
      if (line.startsWith('## ')) { type = 'definition'; content = line.replace('## ', ''); }
      else if (line.startsWith('### ')) { type = 'process'; content = line.replace('### ', ''); }
      else continue;
      if (!content || content.startsWith('*')) continue;
      const node = makeNode(type, x, y);
      node.content = content;
      nodes.push(node);
      if (lastId) vectors.push(makeVector(lastId, node.id));
      lastId = node.id;
      y += 120;
      if (y > 600) { y = 80; x += 260; }
    }
    return { nodes, vectors };
  };

  const handleOpenCanvas = () => {
    if (!currentProject) return;
    if (currentProject.nodes.length === 0 && currentProject.claudeMd) {
      const { nodes, vectors } = buildNodesFromDocument(currentProject.claudeMd);
      patchProject(currentId, { nodes, vectors });
    }
    setScreen('canvas');
  };


  // Main render
  const renderScreen = () => {
    if (!currentId || screen === null) {
      const trialCount = userCredits?.trialCredits ?? 3;
      const minutesCount = userCredits?.minutesBalance ?? 0;
      const isByo = !!userCredits?.byoApiActive;

      let creditsBadgeText = 'Cargando balance...';
      if (userCredits) {
        if (isByo) {
          creditsBadgeText = 'Proyectos ilimitados activos';
        } else if (trialCount > 0) {
          creditsBadgeText = `Tienes ${trialCount} ${trialCount === 1 ? 'proyecto de prueba gratis' : 'proyectos de prueba gratis'}`;
        } else if (minutesCount > 0) {
          creditsBadgeText = `Tienes ${minutesCount} ${minutesCount === 1 ? 'crédito disponible' : 'créditos disponibles'}`;
        } else {
          creditsBadgeText = '0 proyectos de prueba restantes';
        }
      } else {
        creditsBadgeText = 'Tienes 3 proyectos de prueba gratis';
      }

      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: '100%', flexDirection: 'column',
          padding: 'calc(env(safe-area-inset-top, 20px) + 50px) 20px calc(env(safe-area-inset-bottom, 20px) + 16px)',
          boxSizing: 'border-box', overflowY: 'auto', textAlign: 'center',
        }}>
          {/* Espaciador superior para centrado equilibrado del bloque central */}
          <div style={{ flex: 1, minHeight: 0 }} />

          {/* Bloque central de contenido */}
          <div style={{
            width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: isDesktop ? 20 : 16,
          }}>
            {/* Encabezado, badge de prueba gratis y explicación */}
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
                Crea un proyecto para empezar
              </h2>

              <p style={{
                fontSize: 13, color: '#888888', lineHeight: 1.5,
                margin: 0, maxWidth: 360,
              }}>
                Describe tu idea en minutos y genera el CLAUDE.md con todo lo necesario para empezar a construir con Claude Code.
              </p>
            </div>

            {/* Acción Principal */}
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
              <span>Nuevo proyecto</span>
            </button>

            {/* Visual element: Miniatura de CLAUDE.md abajo del botón */}
            <div style={{
              width: '100%', maxWidth: 360,
              background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden', textAlign: 'left',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.12)',
              marginTop: 4,
            }}>
              {/* Header de la miniatura con SVG */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 13px', background: '#1A1A1A', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H14l6 6v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15z"/>
                    <path d="M14 2v6h6"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '0.02em' }}>CLAUDE.md</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: '#22c55e', background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6,
                  padding: '2px 7px', textTransform: 'uppercase',
                }}>
                  Listo para Claude Code ✓
                </span>
              </div>

              {/* Contenido simulado del CLAUDE.md */}
              <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'monospace' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#F3F4F6' }}>
                  # Mi Nuevo Proyecto
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#A1A1AA', marginTop: 2 }}>
                  ## Criterio de éxito y alcance
                </div>
                <div style={{ fontSize: 9.5, color: '#71717A', lineHeight: 1.4 }}>
                  Flujo validado por semáforo y adaptado a tu cliente objetivo.
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#A1A1AA', marginTop: 2 }}>
                  ## Reglas para Claude Code
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#52525B', fontSize: 9.5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c3aed' }} />
                  <span>Stack y restricciones técnicas listas para ejecutar</span>
                </div>
              </div>

              {/* Micro-pills inferiores de valor con iconos SVG limpios */}
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
                  <span>Semáforo IA</span>
                </div>
                <span>·</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span>100% compatible</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer al fondo de la pantalla */}
          <div style={{
            flex: 1, minHeight: 48,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingTop: 20,
          }}>
            <button
              onClick={() => setBuyModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                color: '#666666',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
              onMouseLeave={e => e.currentTarget.style.color = '#666666'}
            >
              ¿Necesitas más proyectos? Explora los planes →
            </button>
          </div>
        </div>
      );
    }

    if (screen === 'capture') return (
      <IdeaCapture
        projectName={currentProject?.name ?? ''}
        initialText={currentProject?.ideaText ?? ''}
        initialMode={currentProject?.ideaMode ?? 'idea'}
        onSubmit={handleIdeaSubmit}
        onBack={() => { setCurrentId(null); setScreen(null); setDrawerOpen(true); }}
        error={error}
        onClearError={() => setError(null)}
      />
    );

    if (screen === 'context') return (
      <ContextCapture
        ideaText={currentProject?.ideaText ?? ''}
        savedProfiles={audienceProfiles}
        onSubmit={handleContextSubmit}
        onSkip={handleContextSkip}
        onBack={() => setScreen('capture')}
        error={error}
        onClearError={() => setError(null)}
      />
    );

    if (screen === 'loading' || screen === 'evaluating' || screen === 'generating_doc') return (
      <LoadingScreen message={loadingMsg} />
    );

    if (screen === 'questionnaire') return (
      <Questionnaire
        questions={questions}
        title={currentProject?.name}
        ideaText={currentProject?.ideaText}
        initialAnswers={currentProject?.pendingAnswers ?? {}}
        onSubmit={handleAnswersSubmit}
        onAnswersChange={handleQuestionnaireAnswerChange}
        onBack={() => setScreen('capture')}
        error={error}
        onClearError={() => setError(null)}
        onError={setError}
      />
    );

    if (screen === 'semaforo' && semaforo) return (
      <SemaforoView
        semaforo={semaforo}
        onGenerate={handleGenerate}
        onBack={() => setScreen('questionnaire')}
        loading={false}
        ideaText={currentProject?.ideaText}
        previousAnswers={answers}
        initialFollowupAnswers={currentProject?.pendingFollowupAnswers ?? {}}
        onFollowupAnswersChange={handleFollowupAnswersChange}
        blockedRounds={blockedRounds}
        maxRefineRounds={MAX_REFINE_ROUNDS}
        onStartOver={handleStartOver}
      />
    );

    if (screen === 'document' && currentProject?.claudeMd) return (
      <DocumentViewer
        claudeMd={currentProject.claudeMd}
        projectName={currentProject.name}
        nodes={currentProject.nodes}
        onOpenCanvas={handleOpenCanvas}
        onNew={() => createNewProject()}
        onClose={() => { setCurrentId(null); setScreen(null); setDrawerOpen(true); }}
        saveStatus={docSaveStatus}
        onRetrySave={() => saveClaudeMd(currentId, { claudeMd: currentProject.claudeMd, semaforo: currentProject.semaforo })}
      />
    );

    if (screen === 'canvas' && currentProject) return (
      <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0A0A0A', overflow: 'hidden' }}>
        <ConceptMap
          ref={mapRef}
          nodes={currentProject.nodes}
          vectors={currentProject.vectors}
          selectedId={selectedNodeId}
          onNodeTap={(id) => { setSelectedNodeId(id); setEditingNodeId(id); }}
          onCanvasTap={(x, y) => {
            setSelectedNodeId(null);
            const node = addNode('conversation', x - 90, y - 45);
            setEditingNodeId(node.id);
          }}
          onCanvasDeselect={() => { setSelectedNodeId(null); setEditingNodeId(null); }}
          onNodeMove={(nodeId, x, y) => updateNode(nodeId, { x, y })}
          onDelete={(nodeId) => {
            setProjects(prev => prev.map(p =>
              p.id !== currentId ? p : {
                ...p,
                nodes:   p.nodes.filter(n => n.id !== nodeId),
                vectors: p.vectors.filter(v => v.fromId !== nodeId && v.toId !== nodeId),
              }
            ));
            setSelectedNodeId(null);
            setEditingNodeId(null);
          }}
          connectingFromId={connectingFromId}
          onConnect={handleConnect}
        />
        {/* Canvas top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: 'calc(env(safe-area-inset-top, 20px) + 10px) 16px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.9) 0%, transparent 100%)',
        }}>
          <button onClick={() => { setScreen('document'); setEditingNodeId(null); setConnectingFromId(null); }}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                     justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E0E0E0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentProject.name} — canvas
          </div>
          <button onClick={() => mapRef.current?.fitAll()}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center',
                     justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round">
              <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
            </svg>
          </button>
        </div>
        {editingNodeId && (
          <NodeEditor
            key={editingNodeId}
            node={currentProject.nodes.find(n => n.id === editingNodeId)}
            onClose={() => setEditingNodeId(null)}
            onSend={content => { updateNode(editingNodeId, { content }); setEditingNodeId(null); }}
            onTypeChange={type => updateNode(editingNodeId, { type })}
            onConnectStart={() => {
              connectingRef.current = editingNodeId;
              setConnectingFromId(editingNodeId);
              setEditingNodeId(null);
            }}
          />
        )}
        {connectingFromId && (
          <div style={{
            position: 'absolute', bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: 12, padding: '10px 20px',
            color: '#7c3aed', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            Toca un nodo para conectar · Canvas para cancelar
          </div>
        )}
      </div>
    );

    return null;
  };

  return (
    <AuthGate>
      <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0A0A0A', overflow: 'hidden' }}>
        {/* Textura de cuadrícula — llena el fondo vacío del estado sin proyectos.
            Las pantallas con contenido propio (IdeaCapture, Questionnaire, etc.)
            son fixed/opacas y la tapan solas, así que no hace falta condicionarla. */}
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

        {/* Floating top bar (only on non-fullscreen screens) */}
        {(screen === null || screen === 'canvas') && screen !== 'canvas' && (
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
              aria-label="Abrir proyectos"
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

        {/* Error toast — not on capture or questionnaire screens (those show it inline) */}
        {error && screen !== 'capture' && screen !== 'questionnaire' && (
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

        {/* Drawer */}
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

        {/* Settings */}
        {settingsOpen && (
          <SettingsPanel
            onClose={() => { setSettingsOpen(false); fetchUserCredits().then(credits => setUserCredits(credits)); }}
            onReplayOnboarding={replayOnboarding}
          />
        )}

        {/* Modal Comprar proyectos directo */}
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

        {/* Tour de inducción — solo en la pantalla inicial, una vez por cuenta */}
        {screen === null && !onboardingSeen && (
          <OnboardingTour steps={ONBOARDING_STEPS} onDone={handleOnboardingDone} />
        )}
      </div>
    </AuthGate>
  );
}
