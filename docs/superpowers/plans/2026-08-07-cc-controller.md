# CC Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un monorepo con una Electron tray app (.dmg) que transmite la terminal de Claude Code en tiempo real vía Supabase Realtime, controlable desde una PWA Next.js instalable en móvil.

**Architecture:** El desktop app (Electron) lanza `claude` en un pseudo-terminal (node-pty), captura el output y lo broadcast a Supabase Realtime. La PWA Next.js se suscribe al mismo canal, renderiza el output y envía comandos de vuelta. Auth via token estático en variable de entorno.

**Tech Stack:** Electron 30+, node-pty 1.0+, @supabase/supabase-js 2+, Next.js 15 (App Router), Tailwind CSS 4, electron-builder 25+, Netlify.

## Global Constraints

- Node.js ≥ 20
- Supabase Broadcast (efímero) — sin escrituras a DB, sin tablas, sin RLS
- Token estático `SESSION_TOKEN` — wrapper rechaza inputs donde `payload.token !== SESSION_TOKEN`
- Service key solo en desktop (nunca en cliente web)
- Anon key en PWA (solo puede broadcast, no lee datos)
- Font: Sora (Google Fonts)
- Paleta: fondo `#fde8e4`, naranja `#f04e23`, teal `#00b09b`, amarillo `#f5c518`, negro `#1a1a1a`, blanco `#ffffff`
- App Router de Next.js — no usar Pages Router

---

## File Map

```
cc-controller/
├── package.json                          # workspace root (npm workspaces)
├── .env.example                          # vars globales de referencia
├── desktop/
│   ├── package.json
│   ├── electron-builder.yml
│   ├── assets/
│   │   └── tray-icon.png                 # 32x32 o 16x16 PNG
│   └── src/
│       ├── main.js                       # Electron main: tray, lifecycle
│       ├── pty.js                        # PtyManager class
│       ├── bridge.js                     # Bridge class (Supabase Realtime)
│       └── preload.js                    # (vacío, requerido por electron-builder)
└── web/
    ├── package.json
    ├── next.config.js
    ├── netlify.toml
    ├── tailwind.config.js
    ├── public/
    │   ├── manifest.json
    │   └── sw.js
    └── app/
        ├── layout.js
        ├── globals.css
        ├── page.js                       # Terminal UI principal
        └── lib/
            └── supabase.js              # Supabase client singleton
```

---

## Task 1: Monorepo scaffold + Supabase setup

**Files:**
- Create: `package.json` (workspace root)
- Create: `.env.example`
- Create: `desktop/package.json`
- Create: `web/package.json`

**Interfaces:**
- Produces: workspace npm funcionando, variables de entorno documentadas

- [ ] **Step 1: Crear workspace root**

```json
// package.json
{
  "name": "cc-controller",
  "private": true,
  "workspaces": ["desktop", "web"],
  "scripts": {
    "desktop": "npm run dev --workspace=desktop",
    "web": "npm run dev --workspace=web"
  }
}
```

- [ ] **Step 2: Crear .env.example**

```bash
# .env.example — copiar a desktop/.env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...   # service_role key (nunca al cliente)
SESSION_ID=main                    # identificador del canal
SESSION_TOKEN=genera-uno-con-openssl-rand-hex-32

# En Netlify: estas van como env vars del proyecto
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # anon/public key
NEXT_PUBLIC_SESSION_ID=main
NEXT_PUBLIC_SESSION_TOKEN=el-mismo-token-de-arriba
```

- [ ] **Step 3: Crear desktop/package.json**

```json
{
  "name": "cc-controller-desktop",
  "version": "1.0.0",
  "main": "src/main.js",
  "scripts": {
    "dev": "electron src/main.js",
    "build": "electron-builder",
    "test": "node --test src/__tests__/"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "dotenv": "^16.4.0",
    "node-pty": "^1.0.0"
  },
  "devDependencies": {
    "electron": "^30.0.0",
    "electron-builder": "^25.0.0"
  }
}
```

- [ ] **Step 4: Crear web/package.json**

```json
{
  "name": "cc-controller-web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

- [ ] **Step 5: Instalar dependencias**

```bash
cd desktop && npm install
cd ../web && npm install
```

- [ ] **Step 6: Crear proyecto Supabase**

Ir a supabase.com → New project → copiar Project URL y las dos keys (service_role y anon) → pegar en `desktop/.env` usando `.env.example` como base.

No crear tablas — Broadcast no las requiere. Verificar en Supabase Dashboard → Realtime → Inspect que el feature está habilitado.

- [ ] **Step 7: Commit**

```bash
git init
git add package.json .env.example desktop/package.json web/package.json
git commit -m "feat: monorepo scaffold + env template"
```

---

## Task 2: PtyManager — desktop/src/pty.js

**Files:**
- Create: `desktop/src/pty.js`
- Create: `desktop/src/__tests__/pty.test.js`

**Interfaces:**
- Produces:
  - `new PtyManager()` → instancia
  - `.spawn(command?: string, args?: string[], cwd?: string)` → void
  - `.write(text: string)` → void
  - `.kill()` → void
  - `.onOutput: (data: string) => void` — callback asignable
  - `.running: boolean` — property

- [ ] **Step 1: Escribir test fallido**

```js
// desktop/src/__tests__/pty.test.js
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock node-pty antes del import
const mockProcess = {
  onData: (cb) => { mockProcess._onData = cb; },
  write: mock.fn(),
  kill: mock.fn(),
};
mock.module('node-pty', {
  namedExports: {
    spawn: mock.fn(() => mockProcess),
  },
});

const { default: PtyManager } = await import('../pty.js');

describe('PtyManager', () => {
  let mgr;
  beforeEach(() => { mgr = new PtyManager(); });

  it('starts not running', () => {
    assert.equal(mgr.running, false);
  });

  it('spawn sets running=true', () => {
    mgr.spawn();
    assert.equal(mgr.running, true);
  });

  it('calls onOutput when process emits data', () => {
    let received = '';
    mgr.onOutput = (d) => { received = d; };
    mgr.spawn();
    mockProcess._onData('hello');
    assert.equal(received, 'hello');
  });

  it('write forwards to process', () => {
    mgr.spawn();
    mgr.write('y\n');
    assert.equal(mockProcess.write.mock.calls[0].arguments[0], 'y\n');
  });

  it('kill sets running=false', () => {
    mgr.spawn();
    mgr.kill();
    assert.equal(mgr.running, false);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
cd desktop && node --test src/__tests__/pty.test.js
```

Expected: `ReferenceError: Cannot find module '../pty.js'`

- [ ] **Step 3: Implementar pty.js**

```js
// desktop/src/pty.js
import pty from 'node-pty';

export default class PtyManager {
  constructor() {
    this.process = null;
    this.onOutput = null;
  }

  get running() {
    return this.process !== null;
  }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this.process = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 220,
      rows: 50,
      cwd,
      env: process.env,
    });
    this.process.onData((data) => {
      this.onOutput?.(data);
    });
  }

  write(text) {
    this.process?.write(text);
  }

  kill() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
```

- [ ] **Step 4: Verificar que pasa**

```bash
cd desktop && node --test src/__tests__/pty.test.js
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/pty.js desktop/src/__tests__/pty.test.js
git commit -m "feat: PtyManager — spawn, write, kill, onOutput callback"
```

---

## Task 3: Bridge — desktop/src/bridge.js

**Files:**
- Create: `desktop/src/bridge.js`
- Create: `desktop/src/__tests__/bridge.test.js`

**Interfaces:**
- Consumes: `@supabase/supabase-js`
- Produces:
  - `new Bridge({ supabaseUrl, supabaseKey, sessionId, sessionToken })` → instancia
  - `.connect()` → void (subscribe al canal)
  - `.broadcast(text: string)` → void (envía evento output)
  - `.disconnect()` → void
  - `.onInput: (text: string) => void` — callback asignable

- [ ] **Step 1: Escribir test fallido**

```js
// desktop/src/__tests__/bridge.test.js
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockSend = mock.fn();
const mockHandlers = {};
const mockChannel = {
  on: (type, filter, cb) => {
    mockHandlers[filter.event] = cb;
    return mockChannel;
  },
  send: mockSend,
  subscribe: mock.fn(() => mockChannel),
};
const mockRemoveChannel = mock.fn();
const mockClient = {
  channel: mock.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};

mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: mock.fn(() => mockClient),
  },
});

const { default: Bridge } = await import('../bridge.js');

const OPTS = {
  supabaseUrl: 'https://x.supabase.co',
  supabaseKey: 'key',
  sessionId: 'main',
  sessionToken: 'secret',
};

describe('Bridge', () => {
  let bridge;
  beforeEach(() => {
    bridge = new Bridge(OPTS);
    mockSend.mock.resetCalls();
  });

  it('connect subscribes to correct channel', () => {
    bridge.connect();
    assert.equal(mockClient.channel.mock.calls[0].arguments[0], 'session:main');
    assert.equal(mockChannel.subscribe.mock.calls.length, 1);
  });

  it('broadcast sends output event', () => {
    bridge.connect();
    bridge.broadcast('hello world');
    const call = mockSend.mock.calls[0].arguments[0];
    assert.equal(call.event, 'output');
    assert.equal(call.payload.text, 'hello world');
  });

  it('rejects input with wrong token', () => {
    let received = null;
    bridge.onInput = (t) => { received = t; };
    bridge.connect();
    mockHandlers['input']({ payload: { text: 'y\n', token: 'wrong' } });
    assert.equal(received, null);
  });

  it('accepts input with correct token', () => {
    let received = null;
    bridge.onInput = (t) => { received = t; };
    bridge.connect();
    mockHandlers['input']({ payload: { text: 'y\n', token: 'secret' } });
    assert.equal(received, 'y\n');
  });

  it('disconnect removes channel', () => {
    bridge.connect();
    bridge.disconnect();
    assert.equal(mockRemoveChannel.mock.calls.length, 1);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
cd desktop && node --test src/__tests__/bridge.test.js
```

Expected: cannot find `../bridge.js`

- [ ] **Step 3: Implementar bridge.js**

```js
// desktop/src/bridge.js
import { createClient } from '@supabase/supabase-js';

export default class Bridge {
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken }) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.sessionId = sessionId;
    this.sessionToken = sessionToken;
    this.channel = null;
    this.onInput = null;
  }

  connect() {
    this.channel = this.client
      .channel(`session:${this.sessionId}`)
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (payload.token !== this.sessionToken) return;
        this.onInput?.(payload.text);
      })
      .subscribe();
  }

  broadcast(text) {
    this.channel?.send({
      type: 'broadcast',
      event: 'output',
      payload: { text, ts: Date.now() },
    });
  }

  disconnect() {
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
```

- [ ] **Step 4: Verificar que pasa**

```bash
cd desktop && node --test src/__tests__/bridge.test.js
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/bridge.js desktop/src/__tests__/bridge.test.js
git commit -m "feat: Bridge — Supabase Realtime broadcast + token validation"
```

---

## Task 4: Electron main + tray — desktop/src/main.js

**Files:**
- Create: `desktop/src/main.js`
- Create: `desktop/src/preload.js`
- Create: `desktop/assets/tray-icon.png` (manual — ver nota)

**Interfaces:**
- Consumes: `PtyManager` (Task 2), `Bridge` (Task 3)
- Produces: app Electron funcional con tray icon, menú Start/Stop/Restart

**Nota:** Para `tray-icon.png` crear cualquier PNG 32x32 de color naranja `#f04e23` con un símbolo ⬡ usando cualquier editor de imagen, o generar con:
```bash
# Requiere ImageMagick
convert -size 32x32 xc:'#f04e23' desktop/assets/tray-icon.png
```

- [ ] **Step 1: Crear preload.js vacío (requerido)**

```js
// desktop/src/preload.js
// no-op — tray app no usa renderer process
```

- [ ] **Step 2: Implementar main.js**

```js
// desktop/src/main.js
import { app, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import PtyManager from './pty.js';
import Bridge from './bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray = null;
let pty = null;
let bridge = null;
let startTime = null;

function getUptime() {
  if (!startTime) return '--:--';
  const s = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function buildMenu(status) {
  const items = [
    { label: 'CC Controller', enabled: false },
    { label: `Estado: ${status}`, enabled: false },
  ];

  if (status === 'running') {
    items.push(
      { label: `Uptime: ${getUptime()}`, enabled: false },
      { label: `Sesión: ${process.env.SESSION_ID}`, enabled: false },
      { type: 'separator' },
      { label: 'Abrir PWA', click: () => shell.openExternal(`https://${process.env.PWA_URL || 'localhost:3000'}`) },
      { type: 'separator' },
      { label: '■ Detener', click: stopSession },
      { label: '↺ Reiniciar', click: () => { stopSession(); startSession(); } },
    );
  } else {
    items.push(
      { type: 'separator' },
      { label: '▶ Iniciar', click: startSession },
    );
  }

  items.push(
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  );

  return Menu.buildFromTemplate(items);
}

function setTrayMenu(status) {
  tray.setContextMenu(buildMenu(status));
  tray.setToolTip(`CC Controller — ${status}`);
}

function startSession() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_ID, SESSION_TOKEN } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SESSION_ID || !SESSION_TOKEN) {
    console.error('Missing env vars. Check desktop/.env');
    return;
  }

  pty = new PtyManager();
  bridge = new Bridge({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_SERVICE_KEY, sessionId: SESSION_ID, sessionToken: SESSION_TOKEN });

  bridge.onInput = (text) => pty.write(text);
  pty.onOutput = (text) => bridge.broadcast(text);

  bridge.connect();
  pty.spawn('claude', []);

  startTime = Date.now();
  setTrayMenu('running');

  // actualizar uptime cada 30s
  setInterval(() => {
    if (pty?.running) setTrayMenu('running');
  }, 30_000);
}

function stopSession() {
  pty?.kill();
  bridge?.disconnect();
  pty = null;
  bridge = null;
  startTime = null;
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

- [ ] **Step 3: Actualizar desktop/package.json para ESM**

Añadir `"type": "module"` al `desktop/package.json`:

```json
{
  "name": "cc-controller-desktop",
  "version": "1.0.0",
  "type": "module",
  "main": "src/main.js",
  ...
}
```

- [ ] **Step 4: Probar manualmente**

Crear `desktop/.env` con los valores reales de Supabase, luego:

```bash
cd desktop && npm run dev
```

Expected: ícono naranja aparece en la barra de menú Mac. Click derecho → menú con "▶ Iniciar". Al iniciar, Claude Code lanza en terminal invisible.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/main.js desktop/src/preload.js desktop/assets/
git commit -m "feat: Electron tray app — start/stop/restart Claude session"
```

---

## Task 5: electron-builder → .dmg

**Files:**
- Create: `desktop/electron-builder.yml`

**Interfaces:**
- Produces: `desktop/dist/CC Controller-1.0.0.dmg` instalable

- [ ] **Step 1: Crear electron-builder.yml**

```yaml
# desktop/electron-builder.yml
appId: com.cccontroller.app
productName: CC Controller
copyright: Copyright © 2026

directories:
  output: dist
  buildResources: assets

files:
  - src/**/*
  - package.json
  - node_modules/**/*

mac:
  category: public.app-category.developer-tools
  icon: assets/tray-icon.png
  target:
    - target: dmg
      arch:
        - arm64
        - x64

dmg:
  title: CC Controller
  window:
    width: 540
    height: 380

nsis:
  oneClick: false
```

- [ ] **Step 2: Build**

```bash
cd desktop && npm run build
```

Expected: `desktop/dist/CC Controller-1.0.0-arm64.dmg` (o x64 según tu Mac).

- [ ] **Step 3: Instalar y verificar**

Abrir el .dmg, arrastrar la app a `/Applications`, lanzarla. El ícono debe aparecer en el menu bar sin abrir Dock.

- [ ] **Step 4: Commit**

```bash
git add desktop/electron-builder.yml
git commit -m "feat: electron-builder config → .dmg para Mac arm64/x64"
```

---

## Task 6: Web — base Next.js + Supabase client

**Files:**
- Create: `web/next.config.js`
- Create: `web/tailwind.config.js`
- Create: `web/app/globals.css`
- Create: `web/app/layout.js`
- Create: `web/app/lib/supabase.js`

**Interfaces:**
- Produces:
  - `import { supabase, SESSION_ID, SESSION_TOKEN } from '@/lib/supabase'`
  - Layout con Sora font, fondo `#fde8e4`, viewport mobile

- [ ] **Step 1: next.config.js**

```js
// web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

- [ ] **Step 2: tailwind.config.js**

```js
// web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sora: ['Sora', 'sans-serif'] },
      colors: {
        cream: '#fde8e4',
        orange: '#f04e23',
        teal: '#00b09b',
        yellow: '#f5c518',
        ink: '#1a1a1a',
      },
      borderRadius: { '2xl': '24px', '3xl': '36px' },
    },
  },
};
```

- [ ] **Step 3: globals.css**

```css
/* web/app/globals.css */
@import 'tailwindcss';

@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Sora', sans-serif;
  background: #fde8e4;
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: layout.js**

```js
// web/app/layout.js
import './globals.css';

export const metadata = {
  title: 'CC Controller',
  description: 'Control Claude Code desde tu móvil',
  manifest: '/manifest.json',
  themeColor: '#f04e23',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CC Controller' },
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: lib/supabase.js**

```js
// web/app/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SESSION_ID = process.env.NEXT_PUBLIC_SESSION_ID ?? 'main';
export const SESSION_TOKEN = process.env.NEXT_PUBLIC_SESSION_TOKEN ?? '';
```

- [ ] **Step 6: Crear web/.env.local para desarrollo**

```bash
# web/.env.local  (no committear — ya está en .gitignore de Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_SESSION_ID=main
NEXT_PUBLIC_SESSION_TOKEN=tu-token-aqui
```

- [ ] **Step 7: Verificar que Next.js arranca**

```bash
cd web && npm run dev
```

Expected: `http://localhost:3000` abre sin errores (404 OK, aún no hay page.js).

- [ ] **Step 8: Commit**

```bash
git add web/next.config.js web/tailwind.config.js web/app/globals.css web/app/layout.js web/app/lib/supabase.js
git commit -m "feat: Next.js base — Sora font, paleta CC Controller, Supabase client"
```

---

## Task 7: Web — Terminal UI (page.js)

**Files:**
- Create: `web/app/page.js`

**Interfaces:**
- Consumes: `supabase`, `SESSION_ID`, `SESSION_TOKEN` de `@/lib/supabase`
- Produces: PWA con terminal en tiempo real, botones de aprobación, input libre

- [ ] **Step 1: Implementar page.js**

```jsx
// web/app/page.js
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, SESSION_ID, SESSION_TOKEN } from './lib/supabase';

const APPROVAL_PATTERNS = [
  /\[y\/n\]/i,
  /approve\?/i,
  /\(y\/n\)/i,
  /continue\?/i,
  /proceed\?/i,
];

function isApprovalPrompt(text) {
  return APPROVAL_PATTERNS.some((p) => p.test(text));
}

export default function Terminal() {
  const [buffer, setBuffer] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const termRef = useRef(null);
  const channelRef = useRef(null);

  const sendInput = useCallback((text) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'input',
      payload: { text, token: SESSION_TOKEN },
    });
  }, []);

  useEffect(() => {
    const ch = supabase.channel(`session:${SESSION_ID}`);
    channelRef.current = ch;

    ch.on('broadcast', { event: 'output' }, ({ payload }) => {
      setBuffer((prev) => {
        const next = prev + payload.text;
        // mantener últimos 50kb
        return next.length > 51_200 ? next.slice(-51_200) : next;
      });
      setNeedsApproval(isApprovalPrompt(payload.text));
    });

    ch.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => { supabase.removeChannel(ch); };
  }, []);

  // auto-scroll al fondo
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [buffer]);

  function handleSend() {
    if (!input.trim()) return;
    sendInput(input + '\n');
    setInput('');
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#fde8e4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 420, background: '#f04e23', borderRadius: 24, padding: '16px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Claude Code
          </span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#fff' : 'rgba(255,255,255,0.3)' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Session<br />{SESSION_ID.toUpperCase()}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
          {connected ? '● Conectado' : '○ Desconectado'}
        </div>
      </div>

      {/* Terminal output */}
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: '#1a1a1a', padding: '6px 14px', fontSize: 9, fontWeight: 700, color: '#00b09b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ● Live output
        </div>
        <pre
          ref={termRef}
          style={{
            padding: '12px 14px',
            fontFamily: 'monospace',
            fontSize: 10,
            lineHeight: 1.7,
            color: '#333',
            background: '#fafafa',
            height: 260,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {buffer || '// Esperando output de Claude Code...'}
        </pre>
      </div>

      {/* Approval card — solo visible cuando Claude pide aprobación */}
      {needsApproval && (
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '2px solid #f04e23', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: '#f04e23', padding: '8px 16px', fontSize: 9, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ⚡ Aprobación requerida
          </div>
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Claude quiere actuar</p>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#999' }}>Revisa el output de arriba</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
            <button
              onClick={() => { sendInput('y\n'); setNeedsApproval(false); }}
              style={{ background: '#1a1a1a', border: 'none', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              ✓ Aprobar
            </button>
            <button
              onClick={() => { sendInput('n\n'); setNeedsApproval(false); }}
              style={{ background: '#fde8e4', border: 'none', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: 800, color: '#f04e23', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
            >
              ✕ Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ width: '100%', maxWidth: 420, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Ctrl+C', text: '\x03' },
          { label: 'Enter ↵', text: '\n' },
          { label: 'y', text: 'y\n' },
          { label: 'n', text: 'n\n' },
        ].map(({ label, text }) => (
          <button
            key={label}
            onClick={() => sendInput(text)}
            style={{ background: '#fff', border: 'none', borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 700, color: '#555', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Escribe un comando..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: '#1a1a1a', fontFamily: 'Sora, sans-serif', background: 'transparent' }}
        />
        <button
          onClick={handleSend}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#f04e23', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ›
        </button>
      </div>

    </main>
  );
}
```

- [ ] **Step 2: Verificar UI en browser**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000` en Chrome → DevTools → toggle mobile view (iPhone 14 Pro). Verificar: header naranja, área terminal, botones quick actions, input con botón send circular.

- [ ] **Step 3: Test de integración manual (con desktop corriendo)**

1. Lanzar `cd desktop && npm run dev`
2. Click en ícono tray → Iniciar
3. Abrir PWA en móvil o Chrome DevTools mobile
4. Verificar que el output de Claude aparece en tiempo real
5. Tocar "y" → verificar que se envía al proceso

- [ ] **Step 4: Commit**

```bash
git add web/app/page.js
git commit -m "feat: terminal PWA — output en tiempo real, approval detection, quick actions"
```

---

## Task 8: PWA manifest + service worker + Netlify config

**Files:**
- Create: `web/public/manifest.json`
- Create: `web/public/sw.js`
- Create: `web/public/icon-192.png` (manual)
- Create: `web/public/icon-512.png` (manual)
- Create: `web/netlify.toml`

**Interfaces:**
- Produces: app instalable como PWA en iOS y Android

- [ ] **Step 1: Crear iconos**

Crear dos PNGs naranjas (`#f04e23`) con letras "CC" blancas:
- `web/public/icon-192.png` → 192x192px
- `web/public/icon-512.png` → 512x512px

Con ImageMagick:
```bash
convert -size 192x192 xc:'#f04e23' -font Helvetica -pointsize 72 -fill white -gravity Center -annotate 0 "CC" web/public/icon-192.png
convert -size 512x512 xc:'#f04e23' -font Helvetica -pointsize 180 -fill white -gravity Center -annotate 0 "CC" web/public/icon-512.png
```

O usar cualquier editor de imagen.

- [ ] **Step 2: manifest.json**

```json
{
  "name": "CC Controller",
  "short_name": "CC Controller",
  "description": "Control Claude Code desde tu móvil",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fde8e4",
  "theme_color": "#f04e23",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 3: sw.js (service worker mínimo)**

```js
// web/public/sw.js
// ponytail: minimal SW para PWA installability — sin cache offline
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
```

- [ ] **Step 4: Registrar SW en layout.js**

Añadir al `<body>` de `web/app/layout.js`:

```jsx
// Añadir dentro del <body> en layout.js, después de {children}:
<script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
`}} />
```

- [ ] **Step 5: netlify.toml**

```toml
# web/netlify.toml
[build]
  base    = "web"
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
```

- [ ] **Step 6: Instalar plugin de Netlify**

```bash
cd web && npm install -D @netlify/plugin-nextjs
```

- [ ] **Step 7: Verificar PWA en Chrome**

```bash
cd web && npm run dev
```

Abrir `http://localhost:3000` → DevTools → Application → Manifest → verificar que carga correctamente. Application → Service Workers → verificar registro.

En Chrome Desktop: ícono de instalación (⊕) aparece en la barra de URL.

- [ ] **Step 8: Commit**

```bash
git add web/public/ web/app/layout.js web/netlify.toml web/package.json
git commit -m "feat: PWA manifest + service worker + Netlify config"
```

---

## Task 9: Deploy a Netlify + .env production

**Files:**
- Modify: ninguno (configuración en Netlify UI)

**Interfaces:**
- Produces: URL pública de la PWA funcional

- [ ] **Step 1: Push a GitHub**

```bash
echo "node_modules/\n.env\ndesktop/.env\nweb/.env.local\ndesktop/dist/" > .gitignore
git add .gitignore
git add .
git commit -m "feat: complete CC Controller"
git remote add origin https://github.com/TU_USUARIO/cc-controller.git
git push -u origin main
```

- [ ] **Step 2: Conectar en Netlify**

1. netlify.com → Add new site → Import from Git → seleccionar el repo
2. Build settings → Netlify los detecta automáticamente desde `netlify.toml`
3. Environment variables → añadir las 4 variables `NEXT_PUBLIC_*` con los valores de Supabase

- [ ] **Step 3: Verificar deploy**

Netlify genera URL del tipo `https://cc-controller-abc123.netlify.app`. Abrir en móvil → verificar que conecta al canal Supabase.

- [ ] **Step 4: Actualizar desktop/.env con URL de PWA**

```bash
# Añadir a desktop/.env
PWA_URL=cc-controller-abc123.netlify.app
```

Esto permite que el tray menu tenga el link "Abrir PWA" correcto.

- [ ] **Step 5: Test end-to-end final**

1. Lanzar .dmg → instalar CC Controller en Mac
2. Click tray → Iniciar
3. Abrir PWA desde móvil (o Chrome mobile)
4. En Safari iOS → Share → Add to Home Screen → instalar como app
5. Verificar flujo completo: output de Claude → PWA → botón Aprobar → respuesta al proceso

---

## Self-Review

| Req del Spec | Task que lo implementa |
|---|---|
| node-pty spawn de claude | Task 2 (PtyManager) |
| Supabase Broadcast bidireccional | Task 3 (Bridge) |
| Token auth — rechazar inputs inválidos | Task 3 (bridge.test.js) |
| Electron tray — start/stop/restart | Task 4 (main.js) |
| .dmg empaquetado | Task 5 (electron-builder.yml) |
| Next.js App Router | Task 6 (layout.js, next.config.js) |
| Supabase client anon en PWA | Task 6 (lib/supabase.js) |
| Terminal output en tiempo real | Task 7 (page.js, useEffect+channel) |
| Approval detection + botones | Task 7 (isApprovalPrompt, needsApproval) |
| Quick actions (y/n/Ctrl+C/Enter) | Task 7 (quick actions grid) |
| PWA instalable (manifest+SW) | Task 8 |
| Netlify deploy config | Task 8 (netlify.toml) |
| Diseño visual bold moderno | Task 7 (estilos inline Sora/paleta) |
| Sin persistencia DB | Task 3 (Broadcast only, sin tablas) |
