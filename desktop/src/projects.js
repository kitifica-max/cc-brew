import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { EOL, homedir } from 'os';
import { fileURLToPath } from 'url';
import { generateClaude } from './claude-md.js';

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

export function listProjects() {
  const data = load();
  const alive = data.projects.filter(p => !p.path || existsSync(p.path));
  if (alive.length !== data.projects.length) {
    data.projects = alive;
    if (!alive.find(p => p.id === data.activeId)) data.activeId = alive[0]?.id ?? null;
    save(data);
  }
  return alive;
}

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

export function renameProject(id, name) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) return;
  project.name = name;
  save(data);
}

export function deleteProject(id) {
  const data = load();
  data.projects = data.projects.filter(p => p.id !== id);
  if (data.activeId === id) data.activeId = data.projects[0]?.id ?? null;
  save(data);
}

export function addExistingProject(id, name, folderPath) {
  const projectPath = resolve(folderPath);
  const data = load();
  const project = { id, name, path: projectPath, createdAt: Date.now() };
  data.projects = [...data.projects.filter(p => p.id !== id), project];
  data.activeId = id;
  save(data);
  return project;
}

export function readMcpConfig(id) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) return {};
  try {
    const raw = JSON.parse(readFileSync(join(project.path, '.claude', 'settings.json'), 'utf8'));
    return raw.mcpServers ?? {};
  } catch { return {}; }
}

export function saveMcpConfig(id, mcpServers) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) throw new Error(`Project not found: ${id}`);
  const claudeDir = join(project.path, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  const settingsPath = join(claudeDir, 'settings.json');
  let existing = {};
  try { existing = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch {}
  writeFileSync(settingsPath, JSON.stringify({ ...existing, mcpServers }, null, 2));
}

function getSkillsSource() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '..', 'assets', 'skills');
}

export function writeSkills(projectPath) {
  try {
    const src = getSkillsSource();
    if (!existsSync(src)) return;
    for (const skillName of readdirSync(src)) {
      const skillSrc = join(src, skillName, 'SKILL.md');
      if (!existsSync(skillSrc)) continue;
      const skillDest = join(projectPath, '.claude', 'skills', skillName);
      mkdirSync(skillDest, { recursive: true });
      copyFileSync(skillSrc, join(skillDest, 'SKILL.md'));
    }
  } catch (_) {}
}

export function writeClaude(projectPath, project) {
  try {
    const target = join(projectPath, 'CLAUDE.md');
    // Don't overwrite external CLAUDE.md (not written by CC Creator)
    if (existsSync(target)) {
      const existing = readFileSync(target, 'utf8');
      if (!existing.startsWith('# CC Creator —')) return;
    }
    writeFileSync(target, generateClaude(project), 'utf8');
  } catch (_) {}
}

export function updateProjectPhase(id, phase) {
  const p = Math.max(1, Math.min(6, parseInt(phase, 10)));
  if (isNaN(p)) return null;
  const data = load();
  const idx = data.projects.findIndex(pr => pr.id === id);
  if (idx === -1) return null;
  data.projects[idx] = { ...data.projects[idx], phase: p };
  save(data);
  writeClaude(data.projects[idx].path, data.projects[idx]);
  return data.projects[idx];
}

export function readProjectEnv(id) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) return {};
  try {
    const envPath = join(project.path, '.env');
    if (!existsSync(envPath)) return {};
    const result = {};
    readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
      const idx = line.indexOf('=');
      if (idx < 1) return;
      const k = line.slice(0, idx).trim();
      if (!k) return;
      let v = line.slice(idx + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
      result[k] = v;
    });
    return result;
  } catch { return {}; }
}

export function saveProjectEnv(id, envObject) {
  const data = load();
  const project = data.projects.find(p => p.id === id);
  if (!project) throw new Error(`Project not found: ${id}`);

  // Merge with existing .env so we never silently erase keys not present in envObject
  const existing = readProjectEnv(id);
  const merged = { ...existing, ...envObject };

  let envContent = '';
  for (const [key, value] of Object.entries(merged)) {
    if (!key || value === undefined || value === null) continue;
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeKey) continue;
    const safeValue = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    envContent += `${safeKey}="${safeValue}"${EOL}`;
  }

  const envPath = join(project.path, '.env');
  writeFileSync(envPath, envContent, { mode: 0o600 });
}
