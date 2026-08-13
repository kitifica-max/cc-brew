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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveProjects(projects) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS))); }
  catch {}
}

export function makeProject(name = 'Nuevo proyecto', id = null) {
  return {
    id: id ?? (Math.random().toString(36).slice(2) + Date.now().toString(36)),
    name,
    path: null,
    model: 'claude-sonnet-4-6',
    effort: 'medium',
    createdAt: Date.now(),
    messages: [],
    isNewStart: true,
  };
}
