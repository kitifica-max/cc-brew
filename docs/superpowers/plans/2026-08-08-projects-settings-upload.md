# CC Controller — Projects, Settings & File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve CC Controller from a single session into a multi-project workspace with per-project directories, model/effort settings, file upload from iPhone, and one-tap open in Claude Desktop.

**Architecture:** Electron is the source of truth for projects (projects.json + ~/CCProjects/ dirs). PWA sends events (create-project, switch-project, upload-file, open-claude-desktop) via Supabase Realtime; Electron validates token on every event, acts, and broadcasts project-state back. Files transit through Supabase Storage and are deleted after Electron downloads them.

**Tech Stack:** Electron 30, Node.js child_process (no node-pty), Supabase Realtime Broadcast + Storage, Next.js 14 PWA (Netlify), Iconifika SVG icons (HTTP API).

## Global Constraints

- All Electron paths must resolve within `~/CCProjects/` — reject any path that escapes it.
- Every PWA→Electron event must be silently rejected if `payload.token !== SESSION_TOKEN`.
- File uploads: extension whitelist `.png .jpg .jpeg .gif .pdf .txt .md .json .csv .svg .zip`, max 10 MB.
- Delete files from Supabase Storage immediately after Electron downloads them.
- No emojis in UI — all icons are inline SVGs fetched from Iconifika HTTP API (`https://iconifika.kitifica.com/api/icon/{set}/{name}`).
- Default model: `claude-sonnet-4-6`. Default effort: `medium`.
- Models available: `claude-opus-5`, `claude-opus-4-6`, `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-haiku-4-5`.
- Effort values: `high`, `medium`, `low`.

---

## File Map

### Desktop (Electron)
| File | Action | Responsibility |
|---|---|---|
| `desktop/src/projects.js` | Create | ProjectManager: CRUD for projects.json + directory creation |
| `desktop/src/bridge.js` | Modify | Add new event listeners + broadcastProjectState + Storage download |
| `desktop/src/pty.js` | Modify | Accept model/effort, pass as CLI flags |
| `desktop/src/main.js` | Modify | Wire ProjectManager, update tray, handle new bridge callbacks |
| `desktop/src/__tests__/projects.test.js` | Create | Unit tests for ProjectManager |

### Web (Next.js PWA)
| File | Action | Responsibility |
|---|---|---|
| `web/app/lib/storage.js` | Create | localStorage helpers: loadProjects, saveProjects, makeProject |
| `web/app/components/ProjectsList.js` | Create | Projects list view + create project flow |
| `web/app/components/SettingsSheet.js` | Create | Bottom drawer: model, effort, open-claude-desktop |
| `web/app/components/FileUpload.js` | Create | File picker + Supabase Storage upload |
| `web/app/page.js` | Modify | Integrate all components, listen for project-state events |

---

## Task 1: ProjectManager — Electron

**Files:**
- Create: `desktop/src/projects.js`
- Create: `desktop/src/__tests__/projects.test.js`

**Interfaces:**
- Produces: `createProject(id, name) → {id, name, path, createdAt}`, `switchProject(id) → project`, `getActive() → project | null`, `listProjects() → project[]`, `deleteProject(id) → void`

- [ ] **Step 1: Write failing tests**

```js
// desktop/src/__tests__/projects.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Override HOME to a temp dir for tests
const TEST_HOME = join(homedir(), '.cc-controller-test-' + Date.now());
process.env.HOME = TEST_HOME;
mkdirSync(join(TEST_HOME, '.config', 'cc-controller'), { recursive: true });
mkdirSync(join(TEST_HOME, 'CCProjects'), { recursive: true });

// Import AFTER setting HOME
const { createProject, listProjects, getActive, switchProject, deleteProject } = await import('../projects.js');

test('createProject creates directory and returns project', () => {
  const p = createProject('test-1', 'My App');
  assert.equal(p.id, 'test-1');
  assert.equal(p.name, 'My App');
  assert.ok(p.path.includes('CCProjects'));
  assert.ok(existsSync(p.path));
});

test('createProject slugifies name', () => {
  const p = createProject('test-2', 'Hello World!!');
  assert.ok(p.path.endsWith('hello-world'));
});

test('createProject rejects path traversal', () => {
  assert.throws(() => createProject('test-3', '../../../etc'), /Invalid/);
});

test('listProjects returns all projects', () => {
  const list = listProjects();
  assert.ok(list.length >= 2);
});

test('switchProject changes active', () => {
  createProject('test-4', 'Other');
  switchProject('test-1');
  assert.equal(getActive().id, 'test-1');
});

test('switchProject rejects unknown id', () => {
  assert.throws(() => switchProject('nonexistent'), /not found/);
});

test('deleteProject removes from list', () => {
  deleteProject('test-4');
  assert.ok(!listProjects().find(p => p.id === 'test-4'));
});

// Cleanup
process.on('exit', () => rmSync(TEST_HOME, { recursive: true, force: true }));
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd desktop && node --test src/__tests__/projects.test.js
```
Expected: `ERR_MODULE_NOT_FOUND` or similar — projects.js doesn't exist.

- [ ] **Step 3: Implement projects.js**

```js
// desktop/src/projects.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const HOME = process.env.HOME || homedir();
const CONFIG_DIR = join(HOME, '.config', 'cc-controller');
const CONFIG_FILE = join(CONFIG_DIR, 'projects.json');
const PROJECTS_BASE = join(HOME, 'CCProjects');

function slugify(name) {
  const s = name.toLowerCase().replace(/[^a-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50);
  if (!s) throw new Error('Invalid project name');
  return s;
}

function load() {
  try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return { projects: [], activeId: null }; }
}

function save(data) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export function listProjects() { return load().projects; }

export function getActive() {
  const { projects, activeId } = load();
  return projects.find(p => p.id === activeId) ?? projects[0] ?? null;
}

export function createProject(id, name) {
  const slug = slugify(name);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd desktop && node --test src/__tests__/projects.test.js
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/projects.js desktop/src/__tests__/projects.test.js
git commit -m "feat: ProjectManager — create/switch/delete projects with ~/CCProjects dirs"
```

---

## Task 2: PtyManager — model/effort flags

**Files:**
- Modify: `desktop/src/pty.js`
- Modify: `desktop/src/__tests__/pty.test.js` (existing)

**Interfaces:**
- Consumes: nothing new from earlier tasks
- Produces: `write(text, continueConv, model, effort)` — model and effort are now forwarded as CLI flags

- [ ] **Step 1: Write failing test**

```js
// Add to desktop/src/__tests__/pty.test.js
test('write passes model and effort as CLI flags', async () => {
  const calls = [];
  const fakeLib = {
    spawn: (cmd, args, opts) => {
      calls.push({ cmd, args });
      return { onData: () => {}, kill: () => {} };
    }
  };
  // ... verify args include --model and --effort
});
```

Since pty.js now uses child_process (not node-pty), the test approach is different. Write a test that stubs spawn and captures args:

```js
// desktop/src/__tests__/pty.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// We test indirectly via the args array built in _flush
// Create a PtyManager subclass that captures spawn calls
test('write builds correct args for model and effort', () => {
  // Verify by reading _flush source — the args array includes model/effort
  // Integration test: run the actual code in a controlled env
  const capturedArgs = [];
  const orig = (await import('child_process')).spawn;
  // Since we can't easily mock ES module imports in Node test runner,
  // we validate by inspecting the queue item directly
  const { default: PtyManager } = await import('../pty.js');
  const pty = new PtyManager();
  pty.spawn('echo', [], '/tmp');
  pty.write('hello', true, 'claude-opus-5', 'high');
  const queued = pty._queue[0];
  assert.equal(queued.model, 'claude-opus-5');
  assert.equal(queued.effort, 'high');
  assert.equal(queued.continueConv, true);
  pty.kill();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd desktop && node --test src/__tests__/pty.test.js
```
Expected: fail — `_queue[0]` doesn't have model/effort yet.

- [ ] **Step 3: Update pty.js**

Replace the `write` and `_flush` methods:

```js
write(text, continueConv = true, model = 'claude-sonnet-4-6', effort = 'medium') {
  if (text === '\x03') return;
  const msg = text.replace(/\n+$/, '').trim();
  if (!msg) return;
  this._queue.push({ msg, continueConv, model, effort });
  this._flush();
}

_flush() {
  if (this._busy || !this._queue.length) return;
  this._busy = true;
  const { msg, continueConv, model, effort } = this._queue.shift();
  const chunks = [];

  const args = ['--print'];
  if (continueConv) args.push('--continue');
  args.push('--model', model, '--effort', effort);

  const proc = spawn(this._command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: this._cwd,
    env: { ...process.env, NO_COLOR: '1' },
  });

  proc.stdin.write(msg + '\n');
  proc.stdin.end();

  proc.stdout.on('data', (d) => chunks.push(d.toString()));
  proc.stderr.on('data', (d) => chunks.push(d.toString()));
  proc.on('close', () => {
    const response = chunks.join('').trim();
    if (response) this.onMessage?.('claude', response);
    this._busy = false;
    this._flush();
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd desktop && node --test src/__tests__/pty.test.js
```

- [ ] **Step 5: Commit**

```bash
git add desktop/src/pty.js
git commit -m "feat: pty forwards --model and --effort flags to claude --print"
```

---

## Task 3: Bridge — new events + Storage download

**Files:**
- Modify: `desktop/src/bridge.js`

**Interfaces:**
- Consumes: Supabase Storage API (this.client.storage)
- Produces: callbacks `onCreateProject(id, name)`, `onSwitchProject(id)`, `onUploadFile(storageKey, filename, projectId)`, `onOpenClaudeDesktop(projectId)`; method `broadcastProjectState(projects, activeId)`; method `downloadFromStorage(storageKey) → Buffer`; method `deleteFromStorage(storageKey)`

- [ ] **Step 1: Write failing test**

```js
// desktop/src/__tests__/bridge.test.js — add test
test('connect subscribes to all new events', () => {
  const events = [];
  const mockChannel = {
    on: (type, { event }, cb) => { events.push(event); return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {} };
  const { default: Bridge } = await import('../bridge.js');
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 't', _createClient: () => mockClient });
  b.connect();
  assert.ok(events.includes('create-project'));
  assert.ok(events.includes('switch-project'));
  assert.ok(events.includes('upload-file'));
  assert.ok(events.includes('open-claude-desktop'));
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd desktop && node --test src/__tests__/bridge.test.js
```

- [ ] **Step 3: Rewrite bridge.js**

```js
// desktop/src/bridge.js
import { createClient as defaultCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const ALLOWED_EXTENSIONS = new Set(['.png','.jpg','.jpeg','.gif','.pdf','.txt','.md','.json','.csv','.svg','.zip']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default class Bridge {
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken, _createClient = defaultCreateClient }) {
    this.client = _createClient(supabaseUrl, supabaseKey, { realtime: { transport: WebSocket } });
    this.sessionId = sessionId;
    this.sessionToken = sessionToken;
    this.channel = null;
    this.onInput = null;
    this.onCreateProject = null;
    this.onSwitchProject = null;
    this.onUploadFile = null;
    this.onOpenClaudeDesktop = null;
  }

  _validate(payload) {
    return payload.token === this.sessionToken;
  }

  connect() {
    this.channel = this.client
      .channel(`session:${this.sessionId}`)
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onInput?.(payload.text, payload.continue !== false, payload.model ?? 'claude-sonnet-4-6', payload.effort ?? 'medium');
      })
      .on('broadcast', { event: 'create-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onCreateProject?.(payload.id, payload.name);
      })
      .on('broadcast', { event: 'switch-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onSwitchProject?.(payload.id);
      })
      .on('broadcast', { event: 'upload-file' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onUploadFile?.(payload.storageKey, payload.filename, payload.projectId);
      })
      .on('broadcast', { event: 'open-claude-desktop' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onOpenClaudeDesktop?.(payload.projectId);
      })
      .subscribe();
  }

  broadcastMessage(role, text) {
    this.channel?.send({ type: 'broadcast', event: 'message', payload: { role, text, ts: Date.now() } });
  }

  broadcastProjectState(projects, activeId) {
    this.channel?.send({ type: 'broadcast', event: 'project-state', payload: { projects, activeId, ts: Date.now() } });
  }

  async downloadFromStorage(storageKey) {
    const { data, error } = await this.client.storage.from('uploads').download(storageKey);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  async deleteFromStorage(storageKey) {
    await this.client.storage.from('uploads').remove([storageKey]);
  }

  disconnect() {
    if (this.channel) { this.client.removeChannel(this.channel); this.channel = null; }
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_BYTES };
```

- [ ] **Step 4: Run tests**

```bash
cd desktop && node --test src/__tests__/bridge.test.js
```

- [ ] **Step 5: Commit**

```bash
git add desktop/src/bridge.js
git commit -m "feat: bridge handles create-project, switch-project, upload-file, open-claude-desktop events"
```

---

## Task 4: main.js — wire ProjectManager + new events

**Files:**
- Modify: `desktop/src/main.js`

**Interfaces:**
- Consumes: `projects.js` (createProject, switchProject, getActive, listProjects), `bridge.js` (new callbacks), `pty.js` (write with model/effort)
- Produces: updated tray menu with active project name/path; full event handling

- [ ] **Step 1: Rewrite main.js**

```js
// desktop/src/main.js
import { app, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import PtyManager from './pty.js';
import Bridge from './bridge.js';
import { createProject, switchProject, getActive, listProjects, deleteProject } from './projects.js';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from './bridge.js';
import { extname, join } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const HOME = process.env.HOME || homedir();
const extraPaths = [`${HOME}/.npm-global/bin`, `${HOME}/.local/bin`, '/opt/homebrew/bin', '/usr/local/bin'].join(':');
process.env.PATH = `${extraPaths}:${process.env.PATH || ''}`;

let tray = null;
let pty = null;
let bridge = null;
let startTime = null;
let uptimeInterval = null;

function getUptime() {
  if (!startTime) return '--:--';
  const s = Math.floor((Date.now() - startTime) / 1000);
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function buildMenu(status) {
  const active = getActive();
  const items = [{ label: 'CC Controller', enabled: false }, { label: `Estado: ${status}`, enabled: false }];

  if (status === 'running') {
    items.push(
      { label: `Uptime: ${getUptime()}`, enabled: false },
      { label: active ? `Proyecto: ${active.name}` : `Sesión: ${process.env.SESSION_ID}`, enabled: false },
      active ? { label: active.path, enabled: false } : null,
      { type: 'separator' },
      { label: 'Abrir PWA', click: () => shell.openExternal(`https://${process.env.PWA_URL || 'localhost:3000'}`) },
      { type: 'separator' },
      { label: '■ Detener', click: stopSession },
      { label: '↺ Reiniciar', click: () => { stopSession(); startSession(); } },
    ).filter(Boolean);
  } else {
    items.push({ type: 'separator' }, { label: '▶ Iniciar', click: startSession });
  }
  items.push({ type: 'separator' }, { label: 'Salir', click: () => app.quit() });
  return Menu.buildFromTemplate(items);
}

function setTrayMenu(status) {
  tray.setContextMenu(buildMenu(status));
  tray.setToolTip(`CC Controller — ${status}`);
}

function broadcastProjects() {
  bridge?.broadcastProjectState(listProjects(), getActive()?.id ?? null);
}

function startSession() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_ID, SESSION_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SESSION_ID || !SESSION_TOKEN) {
    console.error('Missing env vars. Check desktop/.env');
    return;
  }

  const active = getActive();
  pty = new PtyManager();
  pty.spawn('claude', [], active?.path ?? HOME);

  bridge = new Bridge({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_SERVICE_KEY, sessionId: SESSION_ID, sessionToken: SESSION_TOKEN });

  bridge.onInput = (text, continueConv, model, effort) => pty.write(text, continueConv, model, effort);
  pty.onMessage = (role, text) => bridge?.broadcastMessage(role, text);

  bridge.onCreateProject = (id, name) => {
    try {
      const project = createProject(id, name);
      pty.spawn('claude', [], project.path);
      setTrayMenu('running');
      broadcastProjects();
    } catch (e) {
      bridge?.broadcastMessage('system', `Error creando proyecto: ${e.message}`);
    }
  };

  bridge.onSwitchProject = (id) => {
    try {
      const project = switchProject(id);
      pty.spawn('claude', [], project.path);
      setTrayMenu('running');
      broadcastProjects();
    } catch (e) {
      bridge?.broadcastMessage('system', `Error cambiando proyecto: ${e.message}`);
    }
  };

  bridge.onUploadFile = async (storageKey, filename, projectId) => {
    try {
      const projects = listProjects();
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const ext = extname(filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Extensión no permitida: ${ext}`);

      const buffer = await bridge.downloadFromStorage(storageKey);
      if (buffer.length > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx 10MB)');

      const destPath = join(project.path, filename);
      writeFileSync(destPath, buffer);
      await bridge.deleteFromStorage(storageKey);
      bridge?.broadcastMessage('system', `Archivo guardado: ${filename}`);
    } catch (e) {
      bridge?.broadcastMessage('system', `Error subiendo archivo: ${e.message}`);
    }
  };

  bridge.onOpenClaudeDesktop = (projectId) => {
    const project = listProjects().find(p => p.id === projectId);
    if (!project) return;
    exec(`open -a "Claude" "${project.path}"`);
  };

  bridge.connect();

  // Broadcast current projects on connect
  setTimeout(broadcastProjects, 1000);

  startTime = Date.now();
  setTrayMenu('running');
  uptimeInterval = setInterval(() => { if (pty?.running) setTrayMenu('running'); }, 30_000);
}

function stopSession() {
  clearInterval(uptimeInterval);
  pty?.kill();
  bridge?.disconnect();
  pty = null; bridge = null; startTime = null; uptimeInterval = null;
  setTrayMenu('stopped');
}

app.whenReady().then(() => {
  app.dock?.hide();
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  setTrayMenu('stopped');
});

app.on('window-all-closed', (e) => e.preventDefault());
```

- [ ] **Step 2: Run in dev mode to verify no crash**

```bash
cd desktop && npm run dev
```
Expected: tray appears, no console errors.

- [ ] **Step 3: Commit**

```bash
git add desktop/src/main.js
git commit -m "feat: main.js wires ProjectManager, handles all new bridge events, shows project in tray"
```

---

## Task 5: Supabase Storage bucket setup

**Files:**
- No code files — manual steps in Supabase dashboard

- [ ] **Step 1: Create bucket**

1. Go to `https://supabase.com/dashboard/project/qombceeynlvgkmoffcoa/storage/buckets`
2. Click "New bucket"
3. Name: `uploads`
4. Toggle: **Private** (not public)
5. Click "Create bucket"

- [ ] **Step 2: Add RLS policies**

Go to Storage → Policies → `uploads` bucket. Add two policies:

**Policy 1 — INSERT (anon can upload):**
- Policy name: `anon_insert`
- Operation: INSERT
- Target roles: `anon`
- Policy definition: `true`

**Policy 2 — SELECT + DELETE (service_role only — already has full access by default)**
Leave default service_role access. No additional policy needed — service_role bypasses RLS.

- [ ] **Step 3: Verify**

In Supabase dashboard → Storage → `uploads` bucket — confirm bucket exists and is private.

- [ ] **Step 4: Commit note**

```bash
git commit --allow-empty -m "chore: Supabase Storage 'uploads' bucket created (manual step)"
```

---

## Task 6: PWA — localStorage helpers

**Files:**
- Create: `web/app/lib/storage.js`

**Interfaces:**
- Produces: `loadProjects()`, `saveProjects(projects)`, `makeProject(name?)`, constants `MODELS`, `EFFORTS`

- [ ] **Step 1: Create web/app/lib/storage.js**

```js
// web/app/lib/storage.js
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

export function makeProject(name = 'Nuevo proyecto') {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name,
    path: null,
    model: 'claude-sonnet-4-6',
    effort: 'medium',
    createdAt: Date.now(),
    messages: [],
    isNewStart: true,
  };
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd web && node -e "import('./app/lib/storage.js').then(m => console.log(Object.keys(m)))"
```
Expected: `[ 'STORAGE_KEY', 'MAX_PROJECTS', 'MODELS', 'EFFORTS', 'loadProjects', 'saveProjects', 'makeProject' ]`

- [ ] **Step 3: Commit**

```bash
git add web/app/lib/storage.js
git commit -m "feat: PWA localStorage helpers for projects (storage.js)"
```

---

## Task 7: PWA — SettingsSheet component

**Files:**
- Create: `web/app/components/SettingsSheet.js`

**Interfaces:**
- Consumes: `MODELS`, `EFFORTS` from storage.js; `project` object; `onClose()`, `onModelChange(model)`, `onEffortChange(effort)`, `onOpenDesktop()` callbacks
- Produces: `<SettingsSheet project={} onClose onModelChange onEffortChange onOpenDesktop />`

Fetch these SVG icons from Iconifika before implementing (hardcode the SVG strings in the file):
- Close button: `GET https://iconifika.kitifica.com/api/icon/lucide/x`
- Check mark: `GET https://iconifika.kitifica.com/api/icon/lucide/check`
- Monitor/desktop: `GET https://iconifika.kitifica.com/api/icon/lucide/monitor`

- [ ] **Step 1: Fetch SVG icons**

```bash
curl -s "https://iconifika.kitifica.com/api/icon/lucide/x" > /tmp/icon-x.svg
curl -s "https://iconifika.kitifica.com/api/icon/lucide/check" > /tmp/icon-check.svg
curl -s "https://iconifika.kitifica.com/api/icon/lucide/monitor" > /tmp/icon-monitor.svg
cat /tmp/icon-x.svg
```

Copy the raw SVG content for each icon — you will inline them in the component below.

- [ ] **Step 2: Create SettingsSheet.js**

```jsx
// web/app/components/SettingsSheet.js
'use client';
import { MODELS, EFFORTS } from '../lib/storage';

// Paste raw SVG strings fetched in Step 1:
const ICON_X = `<svg .../>`;          // replace with actual SVG from curl
const ICON_CHECK = `<svg .../>`;       // replace with actual SVG from curl
const ICON_MONITOR = `<svg .../>`;     // replace with actual SVG from curl

export default function SettingsSheet({ project, onClose, onModelChange, onEffortChange, onOpenDesktop }) {
  if (!project) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10 }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 11,
        background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '20px 20px 40px', maxHeight: '80dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{project.name}</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#b0a09a', marginTop: 2 }}>
              {project.path ?? 'Creando directorio...'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#f5f0ee', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: ICON_X }}
          />
        </div>

        {/* Model */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b0a09a', marginBottom: 10 }}>Modelo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: project.model === m.id ? '#fde8e4' : '#f9f5f4',
                  border: project.model === m.id ? '1.5px solid #f04e23' : '1.5px solid transparent',
                  borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: project.model === m.id ? '#f04e23' : '#333' }}>
                  {m.label}
                </span>
                {project.model === m.id && (
                  <span style={{ color: '#f04e23', display: 'flex' }} dangerouslySetInnerHTML={{ __html: ICON_CHECK }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Effort */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b0a09a', marginBottom: 10 }}>Effort</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EFFORTS.map(e => (
              <button
                key={e}
                onClick={() => onEffortChange(e)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: project.effort === e ? '#f04e23' : '#f9f5f4',
                  color: project.effort === e ? '#fff' : '#555',
                  fontSize: 12, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Open in Claude Desktop */}
        <button
          onClick={onOpenDesktop}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#1a1a1a', border: 'none', borderRadius: 14, padding: '14px 20px',
            fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}
        >
          <span style={{ display: 'flex', width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: ICON_MONITOR }} />
          Abrir en Claude Desktop
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify no build errors**

```bash
cd web && npm run build 2>&1 | grep -E "error|Error" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add web/app/components/SettingsSheet.js
git commit -m "feat: SettingsSheet — model/effort picker + open in Claude Desktop"
```

---

## Task 8: PWA — ProjectsList component

**Files:**
- Create: `web/app/components/ProjectsList.js`

**Interfaces:**
- Consumes: `projects[]`, `currentId`, `connected` from parent; callbacks `onSwitch(id)`, `onDelete(id)`, `onCreate(name)`, `onBack()`
- Produces: `<ProjectsList projects onSwitch onDelete onCreate onBack currentId />`

Fetch SVG icons:
- Trash/delete: `GET https://iconifika.kitifica.com/api/icon/lucide/trash-2`
- Arrow-left (back): `GET https://iconifika.kitifica.com/api/icon/lucide/arrow-left`
- Plus: `GET https://iconifika.kitifica.com/api/icon/lucide/plus`

- [ ] **Step 1: Fetch SVG icons**

```bash
curl -s "https://iconifika.kitifica.com/api/icon/lucide/trash-2" > /tmp/icon-trash.svg
curl -s "https://iconifika.kitifica.com/api/icon/lucide/arrow-left" > /tmp/icon-back.svg
curl -s "https://iconifika.kitifica.com/api/icon/lucide/plus" > /tmp/icon-plus.svg
```

- [ ] **Step 2: Create ProjectsList.js**

```jsx
// web/app/components/ProjectsList.js
'use client';
import { useState } from 'react';
import { MODELS } from '../lib/storage';

const ICON_TRASH = `<svg .../>`;    // paste from curl
const ICON_BACK = `<svg .../>`;     // paste from curl
const ICON_PLUS = `<svg .../>`;     // paste from curl

export default function ProjectsList({ projects, currentId, onSwitch, onDelete, onCreate, onBack }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setCreating(false);
  }

  return (
    <main style={{ height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              Claude Code
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Proyectos</div>
          </div>
          <button
            onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', width: 14, height: 14, color: '#fff' }} dangerouslySetInnerHTML={{ __html: ICON_BACK }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Volver</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map(p => {
          const modelLabel = MODELS.find(m => m.id === p.model)?.label ?? p.model;
          const isActive = p.id === currentId;
          return (
            <div
              key={p.id}
              onClick={() => onSwitch(p.id)}
              style={{ background: isActive ? '#f04e23' : '#fff', borderRadius: 16, padding: '14px 44px 14px 16px', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? '#fff' : '#1a1a1a', marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'rgba(255,255,255,0.65)' : '#b0a09a' }}>
                {modelLabel} · {p.effort} · {p.messages.length} msgs · {new Date(p.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </div>
              <button
                onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${p.name}"?`)) onDelete(p.id); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 6, color: isActive ? 'rgba(255,255,255,0.5)' : '#ccc' }}
                dangerouslySetInnerHTML={{ __html: ICON_TRASH }}
              />
            </div>
          );
        })}
      </div>

      {/* Create project */}
      <div style={{ padding: '12px 14px 36px', flexShrink: 0 }}>
        {creating ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Nombre del proyecto..."
              style={{ flex: 1, background: '#fff', border: '1.5px solid #f0d8d2', borderRadius: 14, padding: '12px 16px', fontSize: 15, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' }}
            />
            <button
              onClick={handleCreate}
              style={{ background: '#f04e23', border: 'none', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              Crear
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1a1a1a', border: 'none', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
          >
            <span style={{ display: 'flex', width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: ICON_PLUS }} />
            Nuevo proyecto
          </button>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/components/ProjectsList.js
git commit -m "feat: ProjectsList — list, create, switch, delete projects"
```

---

## Task 9: PWA — FileUpload component

**Files:**
- Create: `web/app/components/FileUpload.js`

**Interfaces:**
- Consumes: `supabase` client, `SESSION_ID`, `SESSION_TOKEN` from lib/supabase; `currentProject` object; `onFileSent(filename)` callback; `sendEvent(event, payload)` from parent
- Produces: `<FileUpload currentProject sendEvent onFileSent />`

Fetch SVG icon:
- Paperclip: `GET https://iconifika.kitifica.com/api/icon/lucide/paperclip`

- [ ] **Step 1: Fetch icon**

```bash
curl -s "https://iconifika.kitifica.com/api/icon/lucide/paperclip" > /tmp/icon-paperclip.svg
```

- [ ] **Step 2: Create FileUpload.js**

```jsx
// web/app/components/FileUpload.js
'use client';
import { useRef, useState } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from '../lib/supabase';

const ICON_PAPERCLIP = `<svg .../>`;  // paste from curl

const ALLOWED = new Set(['image/png','image/jpeg','image/gif','application/pdf','text/plain','text/markdown','application/json','text/csv','image/svg+xml','application/zip']);
const MAX_BYTES = 10 * 1024 * 1024;

export default function FileUpload({ currentProject, sendEvent, onFileSent }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.has(file.type)) { alert(`Tipo no permitido: ${file.type}`); return; }
    if (file.size > MAX_BYTES) { alert('Archivo demasiado grande (máx 10MB)'); return; }
    if (!currentProject?.id) { alert('Selecciona un proyecto primero'); return; }

    setUploading(true);
    try {
      const storageKey = `${SESSION_ID}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(storageKey, file);
      if (error) throw error;

      sendEvent('upload-file', { storageKey, filename: file.name, projectId: currentProject.id });
      onFileSent?.(file.name);
    } catch (err) {
      alert(`Error subiendo archivo: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" onChange={handleFile} style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.md,.json,.csv,.svg,.zip" />
      <button
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          background: 'none', border: 'none', padding: 6, cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', color: uploading ? '#ccc' : '#888', flexShrink: 0,
          opacity: uploading ? 0.5 : 1,
        }}
        title="Adjuntar archivo"
        dangerouslySetInnerHTML={{ __html: ICON_PAPERCLIP }}
      />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/components/FileUpload.js
git commit -m "feat: FileUpload — attach files from iPhone, upload to Supabase Storage"
```

---

## Task 10: PWA — page.js full integration

**Files:**
- Modify: `web/app/page.js`

**Interfaces:**
- Consumes: all components from Tasks 7-9, `loadProjects/saveProjects/makeProject` from storage.js, new `project-state` Supabase event

- [ ] **Step 1: Rewrite page.js**

```jsx
// web/app/page.js
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from './lib/supabase';
import { loadProjects, saveProjects, makeProject } from './lib/storage';
import ProjectsList from './components/ProjectsList';
import SettingsSheet from './components/SettingsSheet';
import FileUpload from './components/FileUpload';

// Fetch these SVG icons and inline them:
// GET https://iconifika.kitifica.com/api/icon/lucide/settings-2
// GET https://iconifika.kitifica.com/api/icon/lucide/send
const ICON_SETTINGS = `<svg .../>`;  // paste from curl
const ICON_SEND = `<svg .../>`;      // paste from curl

const QUICK = [
  { label: '⌃C', text: '\x03' },
  { label: '↵', text: '\n' },
  { label: 'y', text: 'y\n' },
  { label: 'n', text: 'n\n' },
];

export default function CCController() {
  const [projects, setProjects] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [view, setView] = useState('chat'); // 'chat' | 'list'
  const [showSettings, setShowSettings] = useState(false);
  const chatRef = useRef(null);
  const channelRef = useRef(null);
  const currentIdRef = useRef(null);

  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  // Init from localStorage
  useEffect(() => {
    let ps = loadProjects();
    if (ps.length === 0) { const p = makeProject(); ps = [p]; }
    setProjects(ps);
    setCurrentId(ps[0].id);
  }, []);

  // Persist
  useEffect(() => { if (projects.length) saveProjects(projects); }, [projects]);

  // Scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [projects, thinking, currentId]);

  // Supabase
  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'message' }, ({ payload }) => {
      setThinking(false);
      const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      setProjects(prev => prev.map(p => {
        if (p.id !== currentIdRef.current) return p;
        return { ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: payload.role, text: payload.text, time }] };
      }));
    });

    ch.on('broadcast', { event: 'project-state' }, ({ payload }) => {
      // Merge Electron-confirmed paths into local projects
      setProjects(prev => prev.map(local => {
        const remote = payload.projects?.find(r => r.id === local.id);
        return remote ? { ...local, path: remote.path } : local;
      }));
    });

    ch.subscribe(s => setConnected(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sendEvent = useCallback((event, payload) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { ...payload, token: SESSION_TOKEN } });
  }, []);

  const sendRaw = useCallback((text, continueConv = true) => {
    const current = projects.find(p => p.id === currentIdRef.current);
    sendEvent('input', { text, continue: continueConv, model: current?.model ?? 'claude-sonnet-4-6', effort: current?.effort ?? 'medium' });
  }, [projects, sendEvent]);

  const currentProject = projects.find(p => p.id === currentId);
  const messages = currentProject?.messages ?? [];

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    const isNewStart = currentProject?.isNewStart ?? false;
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    setProjects(prev => prev.map(p => {
      if (p.id !== currentId) return p;
      return { ...p, isNewStart: false, name: p.name === 'Nuevo proyecto' ? text.slice(0, 40) : p.name, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'user', text, time }] };
    }));
    sendRaw(text + '\n', !isNewStart);
    setInput('');
    setThinking(true);
  }

  function handleCreateProject(name) {
    const p = makeProject(name);
    setProjects(prev => [p, ...prev]);
    setCurrentId(p.id);
    setView('chat');
    setThinking(false);
    sendEvent('create-project', { id: p.id, name });
  }

  function handleSwitchProject(id) {
    setCurrentId(id);
    setView('chat');
    setThinking(false);
    sendEvent('switch-project', { id });
  }

  function handleDeleteProject(id) {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) { const fresh = makeProject(); setCurrentId(fresh.id); return [fresh]; }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  function updateProjectSettings(field, value) {
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, [field]: value } : p));
  }

  if (view === 'list') return (
    <ProjectsList
      projects={projects}
      currentId={currentId}
      onSwitch={handleSwitchProject}
      onDelete={handleDeleteProject}
      onCreate={handleCreateProject}
      onBack={() => setView('chat')}
    />
  );

  return (
    <main style={{ height: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: '#f04e23', padding: '52px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Claude Code</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#00b09b' : 'rgba(255,255,255,0.3)', boxShadow: connected ? '0 0 6px #00b09b' : 'none' }} />
              {connected ? 'Conectado' : 'Desconectado'}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              dangerouslySetInnerHTML={{ __html: ICON_SETTINGS }}
            />
          </div>
        </div>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{currentProject?.name ?? 'Nuevo proyecto'}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {currentProject?.model?.split('-').slice(-2).join(' ')} · {currentProject?.effort} · {projects.length} proyecto{projects.length !== 1 ? 's' : ''} →
          </div>
        </button>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#b0a09a', fontSize: 12, fontWeight: 600, marginTop: 40 }}>
            {currentProject?.path ? `~/CCProjects/${currentProject.name}` : 'Creando directorio...'}
          </div>
        )}
        {messages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
        {thinking && <TypingIndicator />}
      </div>

      {/* Quick actions */}
      <div style={{ background: '#fde8e4', padding: '8px 14px 4px', display: 'flex', gap: 7, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(({ label, text }) => (
          <button key={label} onClick={() => sendRaw(text)} style={{ flexShrink: 0, background: '#fff', border: '1.5px solid #f0d8d2', borderRadius: 20, padding: '7px 14px', fontSize: 11, fontWeight: 700, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #f0d8d2', padding: '10px 14px 32px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <FileUpload
          currentProject={currentProject}
          sendEvent={sendEvent}
          onFileSent={(filename) => {
            const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            setProjects(prev => prev.map(p => p.id !== currentId ? p : { ...p, messages: [...p.messages, { id: Math.random().toString(36).slice(2), role: 'system', text: `Subiendo: ${filename}...`, time }] }));
          }}
        />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: '#fde8e4', border: '1.5px solid #f0d8d2', borderRadius: 22, padding: '10px 16px', fontSize: 16, fontWeight: 500, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          style={{ width: 40, height: 40, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: ICON_SEND }}
        />
      </div>

      {/* Settings sheet */}
      {showSettings && currentProject && (
        <SettingsSheet
          project={currentProject}
          onClose={() => setShowSettings(false)}
          onModelChange={v => updateProjectSettings('model', v)}
          onEffortChange={v => updateProjectSettings('effort', v)}
          onOpenDesktop={() => { sendEvent('open-claude-desktop', { projectId: currentId }); setShowSettings(false); }}
        />
      )}
    </main>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === 'user';
  if (msg.role === 'system') return <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#b0a09a', padding: '4px 0' }}>{msg.text}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>}
      <div style={{ maxWidth: '88%', borderRadius: 18, padding: '10px 14px', ...(isUser ? { background: '#f04e23', color: '#fff', borderBottomRightRadius: 4, fontSize: 14, fontWeight: 500, lineHeight: 1.5 } : { background: '#1a1a1a', color: '#e8e2d8', borderBottomLeftRadius: 4, fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace", fontSize: 12, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }) }}>
        {msg.text}
      </div>
      <div style={{ fontSize: 9, color: '#b0a09a', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{msg.time}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b0a09a', marginBottom: 4, paddingLeft: 4 }}>Claude Code</div>
      <div style={{ background: '#1a1a1a', borderRadius: 18, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a040', animation: `blink 1.2s ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build to catch errors**

```bash
cd web && npm run build 2>&1 | grep -E "Error|error" | grep -v "node_modules" | head -10
```

- [ ] **Step 3: Push to deploy**

```bash
git add web/app/page.js web/app/components/
git commit -m "feat: PWA full integration — projects, settings sheet, file upload, project-state sync"
git push origin main
```

Expected: Netlify deploys within ~90 seconds.

---

## Task 11: Rebuild DMG + smoke test

**Files:**
- No code changes — rebuild only

- [ ] **Step 1: Rebuild DMG**

```bash
cd desktop && npm run build 2>&1 | grep -E "building|built|blockmap"
```
Expected: `CC Controller-1.0.0-arm64.dmg` created in `dist/`.

- [ ] **Step 2: Install and smoke test**

1. Quit existing CC Controller from tray → Salir
2. Move old app to Trash
3. Open `dist/CC Controller-1.0.0-arm64.dmg` → drag to Applications
4. Launch CC Controller → Iniciar
5. Open PWA on iPhone → tap header title → "Nuevo proyecto" shows
6. Tap "Nuevo proyecto" → enter name "Test" → tap Crear
7. Verify tray menu shows `Proyecto: Test`
8. Send a message → verify Claude responds with correct model/effort in args
9. Tap settings gear → change model → verify pill in header updates
10. Attach a file → verify "Archivo guardado: filename" appears in chat
11. Tap "Abrir en Claude Desktop" → verify Claude app opens at project path

- [ ] **Step 3: Final commit**

```bash
git add desktop/dist/CC\ Controller-1.0.0-arm64.dmg
git commit -m "release: v1.1.0 — projects, settings, file upload, Claude Desktop integration"
```
