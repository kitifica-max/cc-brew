import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { EOL } from 'os';
import { homedir } from 'os';

function getHome() {
  return process.env.HOME || homedir();
}

function getConfigDir() {
  return join(getHome(), '.config', 'cc-controller');
}

function getConfigFile() {
  return join(getConfigDir(), 'projects.json');
}

function getProjectsBase() {
  return join(getHome(), 'CCProjects');
}

function slugify(name) {
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid project name');
  }
  const s = name.toLowerCase().replace(/[^a-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50);
  if (!s) throw new Error('Invalid project name');
  return s;
}

function load() {
  try { return JSON.parse(readFileSync(getConfigFile(), 'utf8')); }
  catch { return { projects: [], activeId: null }; }
}

function save(data) {
  mkdirSync(getConfigDir(), { recursive: true });
  writeFileSync(getConfigFile(), JSON.stringify(data, null, 2));
}

export function listProjects() { return load().projects; }

export function getActive() {
  const { projects, activeId } = load();
  return projects.find(p => p.id === activeId) ?? projects[0] ?? null;
}

export function createProject(id, name) {
  const slug = slugify(name);
  const PROJECTS_BASE = getProjectsBase();
  mkdirSync(PROJECTS_BASE, { recursive: true });
  const projectPath = resolve(join(PROJECTS_BASE, slug));
  if (!projectPath.startsWith(PROJECTS_BASE + '/') && projectPath !== PROJECTS_BASE) {
    throw new Error('Invalid project path');
  }
  mkdirSync(projectPath, { recursive: true });
  const data = load();
  const project = { id, name, path: projectPath, createdAt: Date.now() };
  data.projects = [...data.projects.filter(p => p.id !== id), project];
  data.activeId = id;
  save(data);
  return project;
}

export function switchProject(id) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) throw new Error(`Project not found: ${id}`);
  data.activeId = id;
  save(data);
  return project;
}

export function deleteProject(id) {
  const data = load();
  data.projects = data.projects.filter(p => p.id !== id);
  if (data.activeId === id) data.activeId = data.projects[0]?.id ?? null;
  save(data);
}

export function saveProjectEnv(id, envObject) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) throw new Error(`Project not found: ${id}`);

  const PROJECTS_BASE = getProjectsBase();
  if (!project.path.startsWith(PROJECTS_BASE + '/') && project.path !== PROJECTS_BASE) {
    throw new Error('Invalid project path');
  }

  let envContent = '';
  for (const [key, value] of Object.entries(envObject)) {
    if (!key || value === undefined || value === null) continue;
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeKey) continue;
    const safeValue = String(value).replace(/"/g, '\\"');
    envContent += `${safeKey}="${safeValue}"${EOL}`;
  }

  const envPath = join(project.path, '.env');
  writeFileSync(envPath, envContent, { mode: 0o600 });
}
