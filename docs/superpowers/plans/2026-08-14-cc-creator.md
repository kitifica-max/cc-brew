# CC Creator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir CC Controller en CC Creator — una herramienta guiada para crear Apps Directas con un sistema de fases, skills inyectadas automáticamente via CLAUDE.md, y UI mejorada de secrets.

**Architecture:** Enfoque A+C: CC Creator escribe `CLAUDE.md` en la carpeta del proyecto al asignar carpeta y al cambiar de fase (desktop), y envía un mensaje de arranque automático en proyectos nuevos (App Directa → desktop via Supabase broadcast). La app muestra el indicador de fase en el header y un panel de fases lateral.

**Tech Stack:** Electron + Node.js (desktop), Next.js React (App Directa), Supabase Realtime, node-pty

**Spec:** `docs/superpowers/specs/2026-08-14-cc-creator-design.md`

## Global Constraints

- No breaking changes a la arquitectura Supabase Realtime existente
- `CLAUDE.md` se escribe en la raíz del `project.path` (no en `.claude/`)
- El renombre es solo textual — el cask de Homebrew `cc-controller` NO se renombra en esta iteración (breaking change de instalación)
- Todos los textos visibles al usuario cambian a "CC Creator"
- `~/.config/cc-controller/` permanece igual (path del .env del sistema)
- Tests: `node --test` (patrón existente del proyecto)

---

## Mapa de archivos

**Crear:**
- `desktop/src/claude-md.js` — genera contenido CLAUDE.md por fase
- `web/app/components/PhasePanel.js` — indicador de fase + panel lateral
- `web/app/components/SecretsSheet.js` — UI de secrets por categorías

**Modificar:**
- `desktop/package.json` — name
- `desktop/electron-builder.yml` — productName, appId, title
- `desktop/src/main.js` — textos tray, trigger CLAUDE.md, starter message
- `desktop/src/bridge.js` — onPhaseChange, broadcastPhaseChange, onStarterMessage
- `desktop/src/projects.js` — writeClaude.md(), updateProjectPhase()
- `web/app/lib/storage.js` — makeProject con nuevos campos
- `web/app/page.js` — PhasePanel, starter message, phase state
- `web/app/components/SettingsSheet.js` — remover sección env, delegar a SecretsSheet
- `web/app/layout.js` — title
- `web/public/landing/index.html` — textos CC Controller → CC Creator

---

## Task 1: Renombre CC Controller → CC Creator

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/electron-builder.yml`
- Modify: `desktop/src/main.js`
- Modify: `web/app/layout.js`
- Modify: `web/public/landing/index.html`

**Interfaces:**
- Produces: nada nuevo — solo cambios de texto

- [ ] **Step 1: Actualizar desktop/package.json**

```json
{
  "name": "cc-creator-desktop",
  "version": "1.5.1"
}
```

- [ ] **Step 2: Actualizar electron-builder.yml**

Cambiar todas las ocurrencias:
- `appId: com.cccontroller.app` → `appId: com.cccreator.app`
- `productName: CC Controller` → `productName: CC Creator`
- `title: CC Controller` → `title: CC Creator`

- [ ] **Step 3: Actualizar textos en desktop/src/main.js**

Reemplazar todas las ocurrencias de `'CC Controller'` por `'CC Creator'` en:
- `bridge?.sendPush('CC Controller', ...)` (líneas ~69, ~269)
- `{ label: 'CC Controller', enabled: false }` (línea ~91)
- `tray.setToolTip(\`CC Controller — ${status}\`)` (línea ~164)
- `message: 'Tu sesión de CC Controller expiró.'` (línea ~224)
- `detail: '...CC Controller.'` (línea ~249)
- `dialog.showMessageBox({ ...message: 'SESSION_TOKEN no configurado en ~/.config/cc-controller/.env' })` — este NO cambiar (es el path del sistema)

- [ ] **Step 4: Actualizar web/app/layout.js**

```js
export const metadata = {
  title: 'CC Creator',
  // ...
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CC Creator' },
};
```

- [ ] **Step 5: Actualizar landing/index.html**

Reemplazar en todo el archivo:
- `CC Controller` → `CC Creator`
- `cc-controller` en URLs de GitHub/Homebrew → dejar igual (son URLs reales del repo)
- Revisar `<title>`, meta description, og:title, h1, footer, navbar

- [ ] **Step 6: Commit**

```bash
git add desktop/package.json desktop/electron-builder.yml desktop/src/main.js web/app/layout.js web/public/landing/index.html
git commit -m "feat: renombrar CC Controller → CC Creator"
```

---

## Task 2: Modelo de proyecto extendido

**Files:**
- Modify: `web/app/lib/storage.js`

**Interfaces:**
- Produces: `makeProject()` retorna objeto con campos `phase`, `stack`, `isNew`, `githubRepo`, `netlifyUrl`, `supabaseProject`

- [ ] **Step 1: Escribir test**

En `web/app/lib/storage.js` (o archivo de test si existe), verificar que makeProject incluye los nuevos campos:

```js
// desktop/src/__tests__/storage.test.js — si no existe, crear
import { makeProject } from '../../web/app/lib/storage.js';

test('makeProject incluye campos de CC Creator', () => {
  const p = makeProject('Mi App');
  assert.strictEqual(p.phase, 1);
  assert.strictEqual(p.stack, null);
  assert.strictEqual(p.isNew, true);
  assert.strictEqual(p.githubRepo, null);
  assert.strictEqual(p.netlifyUrl, null);
  assert.strictEqual(p.supabaseProject, null);
});
```

Nota: el test de storage existente está en `desktop/src/__tests__/`. Agregar ahí si aplica, o verificar manualmente en el REPL de Node.

- [ ] **Step 2: Actualizar makeProject en web/app/lib/storage.js**

```js
export function makeProject(name = 'Nuevo proyecto', id = null) {
  return {
    id: id ?? (Math.random().toString(36).slice(2) + Date.now().toString(36)),
    name,
    path: null,
    model: 'claude-sonnet-4-6',
    effort: 'medium',
    skipPermissions: true,
    spendLimit: 1.00,
    phase: 1,
    stack: null,
    isNew: true,
    githubRepo: null,
    netlifyUrl: null,
    supabaseProject: null,
    createdAt: Date.now(),
    messages: [],
    isNewStart: true,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/lib/storage.js
git commit -m "feat(storage): agregar campos de fase y stack a proyecto"
```

---

## Task 3: Generador de CLAUDE.md (desktop)

**Files:**
- Create: `desktop/src/claude-md.js`
- Modify: `desktop/src/projects.js`
- Modify: `desktop/src/main.js`

**Interfaces:**
- Consumes: `project.phase` (number 1-6), `project.name` (string), `project.stack` (string|null), `project.githubRepo` (string|null), `project.netlifyUrl` (string|null), `project.supabaseProject` (string|null)
- Produces: `generateClaude(project): string`, `writeClaude(projectPath, project): void`, `updateProjectPhase(id, phase): void`

- [ ] **Step 1: Crear desktop/src/claude-md.js**

```js
const PHASE_NAMES = ['', 'Ideación', 'POC Local', 'Lanzamiento', 'Backend', 'App Directa', 'Validación'];

const PHASE_ROLES = {
  1: `- Saluda al usuario y preséntate como su asistente de desarrollo en CC Creator
- Explica el proceso completo de 6 fases ANTES de hacer cualquier pregunta
- Explica la filosofía Kitifica Local First: construir POC primero, validar, luego escalar
- Pregunta qué quiere construir (una sola pregunta abierta, escucha bien)
- Elige el stack más adecuado para la idea y justifícalo con claridad
- NO empieces a codear hasta tener claridad total de la idea y aprobación explícita del usuario`,

  2: `- Construye la app iterativamente con el stack elegido en fase 1
- Usa el web previewer de CC Creator (botón globo en el header) para mostrar avance en tiempo real
- Prioriza la funcionalidad core sobre diseño perfecto en esta fase
- Aplica las reglas de UI/UX: touch targets ≥ 44px, contraste ≥ 4.5:1, tipografía ≥ 16px en móvil
- Haz commits frecuentes con mensajes descriptivos
- Cuando el usuario esté satisfecho con el POC, dile que puede avanzar a Fase 3 desde el panel de fases`,

  3: `- Guía al usuario para configurar GitHub: explica cómo obtener GITHUB_TOKEN en github.com/settings/tokens (scope: repo)
- Una vez configurado el token, crea el repositorio y haz el primer push del POC
- Guía al usuario para configurar Netlify: explica cómo obtener NETLIFY_TOKEN en app.netlify.com/user/applications
- Conecta el repo a Netlify y realiza el primer deploy
- Confirma que la URL pública funciona antes de dar la fase por completada`,

  4: `- Guía al usuario para obtener credenciales de Supabase: URL, anon key, y service key desde supabase.com/dashboard
- Diseña el schema de base de datos según las necesidades del POC
- Implementa la conexión y migra los datos locales del POC al backend
- Agrega autenticación si el proyecto la requiere
- Prueba que los datos persisten correctamente`,

  5: `- Implementa manifest.json correcto para App Directa (name, icons, start_url, display: standalone, theme_color)
- Implementa service worker para funcionamiento offline básico
- Configura todas las variables de entorno de producción
- Optimiza: lazy loading de imágenes, code splitting, Lighthouse score ≥ 80
- Implementa accesibilidad completa: aria-labels, keyboard nav, focus states
- Prepara el proyecto para la validación de Kitifica`,

  6: `- Revisa el checklist completo de App Directa con el usuario
- Indica al usuario que puede validar su App Directa en kitifica.com/validador/ con la URL del proyecto
- Corrige los issues que el validador encuentre
- Celebra el lanzamiento con el usuario`,
};

const SKILLS_BY_PHASE = {
  1: `### Skills activos — Fase 1
**Systematic approach:** Haz preguntas una a la vez. No propongas soluciones hasta entender el problema completo.
**Stack selection:** Elige el stack más simple que resuelva el problema. YAGNI — no sobre-ingenierices.`,

  2: `### Skills activos — Fase 2
**UI/UX:** Touch targets ≥ 44px. Contraste ≥ 4.5:1. Fuente body ≥ 16px en móvil. Usa cursor-pointer en elementos clickeables.
**TDD básico:** Escribe la función, pruébala manualmente en el previewer antes de continuar.
**Commits frecuentes:** Un commit por feature funcional.`,

  3: `### Skills activos — Fase 3
**Instrucciones paso a paso:** Guía cada acción en el chat. El usuario no sabe dónde buscar los tokens — sé específico con URLs y pasos.
**Verificación:** Confirma cada paso antes de continuar. Si algo falla, diagnostica antes de proponer fix.`,

  4: `### Skills activos — Fase 4
**Schema first:** Diseña el schema completo antes de implementar. Revísalo con el usuario.
**Security:** Nunca expongas service keys en el frontend. Usa anon key en cliente, service key solo en edge functions.`,

  5: `### Skills activos — Fase 5
**Verification before completion:** No declares terminado sin verificar en un dispositivo real o emulador.
**App Directa checklist:** manifest.json válido, service worker registrado, HTTPS, responsive, offline básico.
**Performance:** Web Vitals — LCP < 2.5s, CLS < 0.1, FID < 100ms.`,

  6: `### Skills activos — Fase 6
**Validación externa:** Usa kitifica.com/validador/ para obtener feedback objetivo.
**Fix prioritization:** Corrige primero los issues críticos (seguridad, funcionalidad), luego los de UX.`,
};

export function generateClaude(project) {
  const phase = project.phase ?? 1;
  const phaseName = PHASE_NAMES[phase] ?? 'Desconocida';
  const context = [
    project.githubRepo ? `- GitHub: ${project.githubRepo}` : null,
    project.netlifyUrl ? `- Netlify: ${project.netlifyUrl}` : null,
    project.supabaseProject ? `- Supabase: ${project.supabaseProject}` : null,
  ].filter(Boolean).join('\n') || '- (Sin configurar aún)';

  return `# CC Creator — ${project.name}
## Fase actual: ${phase} · ${phaseName}
**Stack:** ${project.stack ?? 'Por definir en fase 1'}

### Filosofía Kitifica Local First
Construir primero un POC funcional local. Validar la idea con usuarios reales antes de invertir en infraestructura. Escalar progresivamente: local → GitHub/Netlify → Backend → App Directa completa.

### Tu rol en esta fase
${PHASE_ROLES[phase] ?? ''}

${SKILLS_BY_PHASE[phase] ?? ''}

### Contexto del proyecto
${context}

### Proceso completo (6 fases)
1. Ideación — Escuchar la idea, elegir stack, planificar
2. POC Local — Construir y probar localmente con web previewer
3. Lanzamiento — GitHub + Netlify deploy
4. Backend — Supabase: datos, auth, storage
5. App Directa — Manifest, service worker, optimización
6. Validación — Certificar en kitifica.com/validador/
`;
}
```

- [ ] **Step 2: Agregar writeClaude y updateProjectPhase en desktop/src/projects.js**

Importar al inicio del archivo:
```js
import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateClaude } from './claude-md.js';
```

Agregar al final del archivo:
```js
export function writeClaude(projectPath, project) {
  try {
    writeFileSync(join(projectPath, 'CLAUDE.md'), generateClaude(project), 'utf8');
  } catch (_) {}
}

export function updateProjectPhase(id, phase) {
  const projects = listProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], phase };
  saveProjectsDesktop(projects);
  writeClaude(projects[idx].path, projects[idx]);
  return projects[idx];
}
```

Nota: `saveProjectsDesktop` es la función interna de projects.js que persiste el array — usar la que ya existe en el archivo.

- [ ] **Step 3: Disparar writeClaude en main.js al asignar carpeta**

En `desktop/src/main.js`, importar `writeClaude` y `updateProjectPhase`:
```js
import { createProject, switchProject, getActive, listProjects, deleteProject, saveProjectEnv, addExistingProject, readMcpConfig, saveMcpConfig, writeClaude, updateProjectPhase } from './projects.js';
```

Encontrar el handler `bridge.onOpenFolder` o el lugar donde se confirma la carpeta de un proyecto y agregar después de guardar el proyecto:
```js
// Después de addExistingProject o al confirmar la carpeta:
const project = listProjects().find(p => p.id === id);
if (project?.path) writeClaude(project.path, project);
```

- [ ] **Step 4: Test manual**

```bash
cd desktop
node -e "
import('./src/claude-md.js').then(({ generateClaude }) => {
  const p = { name: 'Mi App', phase: 1, stack: null, githubRepo: null, netlifyUrl: null, supabaseProject: null };
  console.log(generateClaude(p));
});
"
```

Verificar que el output es un CLAUDE.md válido con las secciones correctas.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/claude-md.js desktop/src/projects.js desktop/src/main.js
git commit -m "feat(desktop): generador CLAUDE.md por fase"
```

---

## Task 4: Bridge — eventos de fase

**Files:**
- Modify: `desktop/src/bridge.js`
- Modify: `desktop/src/main.js`

**Interfaces:**
- Consumes: `onPhaseChange(projectId, phase)` callback
- Produces: `broadcastPhaseChange(projectId, phase)`, evento Supabase `phase-change` con payload `{ projectId, phase, ts }`

- [ ] **Step 1: Agregar en bridge.js — constructor**

En el constructor de Bridge, junto a los otros callbacks:
```js
this.onPhaseChange = null;
```

- [ ] **Step 2: Agregar listener en bridge.js — connect()**

Dentro del `.channel(...)`, antes de `.subscribe()`:
```js
.on('broadcast', { event: 'phase-change' }, ({ payload }) => {
  if (!this._validate(payload)) return;
  this.onPhaseChange?.(payload.projectId, payload.phase);
})
```

- [ ] **Step 3: Agregar broadcastPhaseChange en bridge.js**

```js
broadcastPhaseChange(projectId, phase) {
  this.channel?.send({
    type: 'broadcast', event: 'phase-changed',
    payload: { projectId, phase, ts: Date.now() },
  });
}
```

Nota: el evento que el desktop envía a la app se llama `phase-changed` (pasado), el que la app envía al desktop se llama `phase-change` (imperativo).

- [ ] **Step 4: Wiring en main.js**

```js
bridge.onPhaseChange = (projectId, phase) => {
  const updated = updateProjectPhase(projectId, phase);
  if (updated) bridge?.broadcastPhaseChange(projectId, phase);
};
```

- [ ] **Step 5: Commit**

```bash
git add desktop/src/bridge.js desktop/src/main.js
git commit -m "feat(bridge): eventos phase-change ↔ phase-changed"
```

---

## Task 5: Starter message automático

**Files:**
- Modify: `desktop/src/bridge.js`
- Modify: `desktop/src/main.js`
- Modify: `web/app/page.js`

**Interfaces:**
- Consumes: `project.isNew === true`
- Produces: cuando la App Directa se conecta con `isNew: true`, el desktop auto-envía un mensaje a Claude para iniciar la conversación guiada

**Estrategia:** La app detecta `isNew` al cambiar de proyecto. Si es true, envía evento `starter-message` al desktop. El desktop lo convierte en input a Claude. Al completar, broadcast `starter-sent` y la App Directa pone `isNew: false`.

- [ ] **Step 1: Agregar onStarterMessage en bridge.js — constructor**

```js
this.onStarterMessage = null;
```

- [ ] **Step 2: Agregar listener en bridge.js — connect()**

```js
.on('broadcast', { event: 'starter-message' }, ({ payload }) => {
  if (!this._validate(payload)) return;
  this.onStarterMessage?.(payload.projectId);
})
```

- [ ] **Step 3: Wiring en main.js**

```js
bridge.onStarterMessage = (projectId) => {
  const project = listProjects().find(p => p.id === projectId);
  if (!project) return;
  const msg = `Eres el asistente de CC Creator para el proyecto "${project.name}". Por favor:
1. Saluda al usuario y preséntate
2. Explica el proceso de 6 fases de CC Creator y la filosofía Kitifica Local First
3. Pregunta qué quiere construir
No empieces a codear todavía.`;
  pty?.write(msg, false, project.model ?? 'claude-sonnet-4-6', project.effort ?? 'medium', projectId, true);
};
```

- [ ] **Step 4: Disparar desde page.js**

En `web/app/page.js`, en el efecto donde se cambia de proyecto (cerca de donde se usa `isNewStart`), agregar:

```js
// Después de hacer switch de proyecto, si el proyecto tiene isNew: true:
useEffect(() => {
  if (!currentProject?.isNew || !connected) return;
  sendEvent('starter-message', { projectId: currentId });
  // Marcar isNew: false en localStorage
  setProjects(prev => prev.map(p =>
    p.id === currentId ? { ...p, isNew: false } : p
  ));
}, [currentId, connected]);
```

Verificar que este efecto se ejecuta una sola vez por proyecto nuevo (isNew se pone false inmediatamente).

- [ ] **Step 5: Commit**

```bash
git add desktop/src/bridge.js desktop/src/main.js web/app/page.js
git commit -m "feat: starter message automático en proyectos nuevos"
```

---

## Task 6: Phase indicator + PhasePanel (App Directa)

**Files:**
- Create: `web/app/components/PhasePanel.js`
- Modify: `web/app/page.js`

**Interfaces:**
- Consumes: `project.phase` (number), `currentId` (string), `sendEvent` (function)
- Produces: pill clickeable en header + panel lateral con las 6 fases + botón de avance

- [ ] **Step 1: Crear web/app/components/PhasePanel.js**

```jsx
'use client';
import { useState } from 'react';

const PHASES = [
  { n: 1, name: 'Ideación', desc: 'Definir la idea y elegir el stack' },
  { n: 2, name: 'POC Local', desc: 'Construir y probar localmente' },
  { n: 3, name: 'Lanzamiento', desc: 'GitHub + Netlify deploy' },
  { n: 4, name: 'Backend', desc: 'Supabase: datos, auth, storage' },
  { n: 5, name: 'App Directa', desc: 'Manifest, service worker, optimización' },
  { n: 6, name: 'Validación', desc: 'Certificar en kitifica.com/validador/' },
];

export default function PhasePanel({ phase, projectId, onPhaseChange }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const advance = () => {
    if (phase >= 6) return;
    setConfirming(true);
  };

  const confirmAdvance = () => {
    onPhaseChange(projectId, phase + 1);
    setConfirming(false);
    setOpen(false);
  };

  return (
    <>
      {/* Pill en header */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
          padding: '4px 10px', cursor: 'pointer', color: '#fff', fontSize: 11,
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        Fase {phase} · {PHASES[phase - 1]?.name ?? ''} <span style={{ fontSize: 9 }}>▸</span>
      </button>

      {/* Panel lateral */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => { setOpen(false); setConfirming(false); }}>
          <div style={{ background: '#1a1a1a', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Proceso de desarrollo</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PHASES.map(p => (
                <div key={p.n} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 12, background: p.n === phase ? 'rgba(232,73,15,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.n === phase ? 'rgba(232,73,15,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    background: p.n < phase ? '#22c55e' : p.n === phase ? '#e8490f' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}>
                    {p.n < phase ? '✓' : p.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.n === phase ? '#fff' : p.n < phase ? '#86efac' : '#666' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {!confirming && phase < 6 && (
              <button
                onClick={advance}
                style={{ width: '100%', marginTop: 16, background: '#e8490f', border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Avanzar a Fase {phase + 1} · {PHASES[phase]?.name} →
              </button>
            )}

            {confirming && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>¿Confirmas que quieres avanzar a Fase {phase + 1}? Esto actualizará las instrucciones de Claude.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirming(false)} style={{ flex: 1, background: '#2a2a2a', border: 'none', borderRadius: 10, padding: 12, color: '#fff', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={confirmAdvance} style={{ flex: 2, background: '#e8490f', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Integrar PhasePanel en page.js**

Importar al inicio:
```js
import PhasePanel from './components/PhasePanel';
```

En el header del chat (junto al pill de donas y settings), agregar:
```jsx
{currentProject && (
  <PhasePanel
    phase={currentProject.phase ?? 1}
    projectId={currentId}
    onPhaseChange={(projectId, phase) => {
      // Actualizar local
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, phase } : p));
      // Notificar desktop
      sendEvent('phase-change', { projectId, phase });
    }}
  />
)}
```

- [ ] **Step 3: Escuchar phase-changed del desktop en page.js**

En el bloque de listeners del canal Supabase (donde están los otros `ch.on`):
```js
ch.on('broadcast', { event: 'phase-changed' }, ({ payload }) => {
  if (!active) return;
  setProjects(prev => prev.map(p =>
    p.id === payload.projectId ? { ...p, phase: payload.phase } : p
  ));
});
```

- [ ] **Step 4: Test manual**

1. Abrir CC Creator App Directa en un proyecto
2. Verificar que aparece el pill "Fase 1 · Ideación ▸" en el header
3. Tocarlo → panel abre con las 6 fases
4. Tocar "Avanzar a Fase 2" → confirmar → pill cambia a "Fase 2 · POC Local ▸"

- [ ] **Step 5: Commit**

```bash
git add web/app/components/PhasePanel.js web/app/page.js
git commit -m "feat(pwa): indicador de fases + PhasePanel"
```

---

## Task 7: Secrets UI por categorías

**Files:**
- Create: `web/app/components/SecretsSheet.js`
- Modify: `web/app/components/SettingsSheet.js`
- Modify: `web/app/page.js`

**Interfaces:**
- Consumes: `project` (object con `phase`), `onSave(envObject)` callback
- Produces: sheet con variables organizadas por categoría según la fase actual

- [ ] **Step 1: Crear web/app/components/SecretsSheet.js**

```jsx
'use client';
import { useState } from 'react';

const CATEGORIES = [
  {
    key: 'github',
    label: 'GitHub',
    minPhase: 3,
    vars: [
      { key: 'GITHUB_TOKEN', label: 'Token de acceso', help: 'Crea en github.com/settings/tokens → Fine-grained token → scope: repo' },
    ],
  },
  {
    key: 'netlify',
    label: 'Netlify',
    minPhase: 3,
    vars: [
      { key: 'NETLIFY_TOKEN', label: 'Token personal', help: 'Crea en app.netlify.com/user/applications → Personal access tokens' },
      { key: 'NETLIFY_SITE_ID', label: 'Site ID', help: 'Lo encontrarás en Site settings → General → Site ID' },
    ],
  },
  {
    key: 'supabase',
    label: 'Supabase',
    minPhase: 4,
    vars: [
      { key: 'SUPABASE_URL', label: 'Project URL', help: 'En supabase.com/dashboard → Settings → API → Project URL' },
      { key: 'SUPABASE_ANON_KEY', label: 'Anon key (pública)', help: 'En supabase.com/dashboard → Settings → API → anon public' },
      { key: 'SUPABASE_SERVICE_KEY', label: 'Service key (privada)', help: 'En supabase.com/dashboard → Settings → API → service_role (¡solo en backend!)' },
    ],
  },
];

export default function SecretsSheet({ project, currentEnv = {}, onSave, onClose }) {
  const [values, setValues] = useState(currentEnv);
  const [showHelp, setShowHelp] = useState(null);
  const phase = project?.phase ?? 1;

  const visibleCategories = CATEGORIES.filter(c => c.minPhase <= phase);

  const save = () => {
    const filtered = Object.fromEntries(Object.entries(values).filter(([, v]) => v?.trim()));
    onSave(filtered);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Secrets</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          Claude te guiará en el chat para obtener cada token. Aquí solo pégalos y confírmalos.
          {phase < 3 && ' Los secrets de GitHub y Netlify se activarán en Fase 3.'}
        </p>

        {visibleCategories.map(cat => (
          <div key={cat.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e8490f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.vars.map(v => (
                <div key={v.key} style={{ background: '#2a2a2a', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{v.key}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {values[v.key] ? <span style={{ fontSize: 10, color: '#86efac' }}>✓ configurado</span> : <span style={{ fontSize: 10, color: '#666' }}>vacío</span>}
                      <button onClick={() => setShowHelp(showHelp === v.key ? null : v.key)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#aaa', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
                    </div>
                  </div>
                  {showHelp === v.key && (
                    <p style={{ fontSize: 11, color: '#86efac', margin: '0 0 8px', lineHeight: 1.5 }}>{v.help}</p>
                  )}
                  <input
                    type="password"
                    placeholder={`Pega tu ${v.label.toLowerCase()} aquí`}
                    value={values[v.key] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Custom */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Custom</div>
          <textarea
            placeholder={'API_KEY=valor\nOTRA_VAR=valor'}
            value={Object.entries(values)
              .filter(([k]) => !CATEGORIES.flatMap(c => c.vars).map(v => v.key).includes(k))
              .map(([k, v]) => `${k}=${v}`).join('\n')}
            onChange={e => {
              const custom = {};
              e.target.value.split('\n').forEach(line => {
                const [k, ...rest] = line.split('=');
                if (k?.trim()) custom[k.trim()] = rest.join('=').trim();
              });
              setValues(prev => {
                const predefined = Object.fromEntries(
                  Object.entries(prev).filter(([k]) => CATEGORIES.flatMap(c => c.vars).map(v => v.key).includes(k))
                );
                return { ...predefined, ...custom };
              });
            }}
            style={{ width: '100%', background: '#2a2a2a', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 12, fontFamily: 'monospace', minHeight: 80, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={save}
          style={{ background: '#e8490f', border: 'none', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Guardar secrets
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar botón "Secrets" en SettingsSheet.js**

En `SettingsSheet.js`, reemplazar la sección de variables de entorno (el textarea de env actual) por:

```jsx
<button
  onClick={onOpenSecrets}
  style={{ width: '100%', background: '#2a2a2a', border: '1px solid #333', borderRadius: 10, padding: '12px 16px', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}
>
  <span>Variables de entorno & Secrets</span>
  <span style={{ color: '#666' }}>→</span>
</button>
```

Agregar `onOpenSecrets` a los props de SettingsSheet.

- [ ] **Step 3: Wiring en page.js**

Importar SecretsSheet:
```js
import SecretsSheet from './components/SecretsSheet';
```

Agregar estado:
```js
const [showSecrets, setShowSecrets] = useState(false);
const [currentEnv, setCurrentEnv] = useState({});
```

En el render, después de SettingsSheet:
```jsx
{showSecrets && currentProject && (
  <SecretsSheet
    project={currentProject}
    currentEnv={currentEnv}
    onSave={(env) => {
      setCurrentEnv(env);
      sendEvent('save-env', { projectId: currentId, env });
    }}
    onClose={() => setShowSecrets(false)}
  />
)}
```

En SettingsSheet, pasar:
```jsx
onOpenSecrets={() => { setShowSettings(false); setShowSecrets(true); }}
```

- [ ] **Step 4: Test manual**

1. Abrir settings de un proyecto en fase 1 → verificar que solo aparece la sección Custom
2. Avanzar a fase 3 → abrir secrets → verificar que aparecen GitHub y Netlify
3. Avanzar a fase 4 → abrir secrets → verificar que aparece también Supabase
4. Pegar un valor y guardar → verificar que llega al desktop vía save-env

- [ ] **Step 5: Commit**

```bash
git add web/app/components/SecretsSheet.js web/app/components/SettingsSheet.js web/app/page.js
git commit -m "feat(pwa): secrets UI por categorías según fase"
```

---

## Self-review

**Cobertura del spec:**
- ✅ Renombre CC Controller → CC Creator (Task 1)
- ✅ Sistema de 6 fases con avance manual (Tasks 3, 4, 6)
- ✅ CLAUDE.md generado por fase con skills condensadas (Task 3)
- ✅ Mensaje de arranque automático en proyectos nuevos (Task 5)
- ✅ Indicador de fase en header + panel lateral (Task 6)
- ✅ Secrets UI por categorías según fase (Task 7)
- ✅ Modelo de proyecto extendido (Task 2)
- ⏸ Kitifica Validador (fase 6): se implementa dentro del CLAUDE.md — Claude indica al usuario que abra kitifica.com/validador/. No requiere tarea separada.

**Tipo consistencia:**
- `phase` es siempre `number` (1-6)
- `sendEvent('phase-change', { projectId, phase })` coincide con el listener en bridge.js
- `broadcastPhaseChange(projectId, phase)` → evento `phase-changed` → listener en page.js

**No hay placeholders.**
