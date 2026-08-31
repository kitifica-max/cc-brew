export const STORAGE_KEY = 'cc-projects-v2';
export const MAX_PROJECTS = 20;

export const MODELS = [
  { id: 'claude-opus-5', label: 'Opus 5' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
];

export const EFFORTS = ['high', 'medium', 'low'];

export function loadProjects() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return raw.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path ?? null,
      model: p.model ?? 'claude-sonnet-4-6',
      effort: p.effort ?? 'medium',
      createdAt: p.createdAt ?? Date.now(),
      nodes: p.nodes ?? [],
      vectors: p.vectors ?? [],
      ideaText: p.ideaText ?? null,
      ideaMode: p.ideaMode ?? 'idea',
      claudeMd: p.claudeMd ?? null,
      semaforo: p.semaforo ?? null,
      sessionId: p.sessionId ?? null,
      pendingFollowupAnswers: p.pendingFollowupAnswers ?? null,
      documentConfirmed: p.documentConfirmed ?? false,
    }));
  } catch { return []; }
}

export function saveProjects(projects) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS))); }
  catch {}
}

export const NODE_TYPES = ['conversation', 'reference', 'definition', 'process'];

export function makeProject(name = 'Nuevo proyecto', id = null) {
  return {
    id: id ?? (Math.random().toString(36).slice(2) + Date.now().toString(36)),
    name,
    path: null,
    model: 'claude-sonnet-4-6',
    effort: 'medium',
    createdAt: Date.now(),
    nodes: [],
    vectors: [],
    // v2 fields
    ideaText: null,
    ideaMode: 'idea',
    claudeMd: null,
    semaforo: null,
    sessionId: null,
    pendingFollowupAnswers: null,
    documentConfirmed: false,
  };
}

export function makeNode(type = 'conversation', x = 0, y = 0) {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    type,
    x,
    y,
    content: '',
    aiContent: '',
    createdAt: Date.now(),
  };
}

export function makeVector(fromId, toId, label = '') {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    fromId,
    toId,
    label,
  };
}
