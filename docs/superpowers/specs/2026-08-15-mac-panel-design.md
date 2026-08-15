# Mac HUD Panel — Design Spec
**Fecha:** 2026-08-15
**Estado:** Aprobado

---

## Goal

Agregar un panel flotante tipo popover al tray icon del desktop Electron de CC Creator. El panel muestra el proyecto activo, la fase actual con indicador visual de 6 fases, el streaming de Claude en tiempo real, y permite avanzar de fase sin usar el iPhone.

El iPhone sigue siendo el mando principal. El panel Mac es el monitor complementario.

---

## Architecture

### Archivos nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `desktop/src/panel-window.js` | Crea y posiciona el BrowserWindow. Maneja toggle y blur-to-close. |
| `desktop/src/panel-preload.js` | contextBridge: expone IPC events al panel HTML. |
| `desktop/src/panel.html` | UI completa del panel (HTML + CSS + JS inline). |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `desktop/src/main.js` | Tray left-click → toggle panel. Redirige pty chunks al panel. Redirige broadcastProjects al panel. Registra ipcMain handlers del panel. |

Archivos no tocados: `bridge.js`, `pty.js`, `projects.js`, `setup-window.js`, `claude-md.js`.

---

## BrowserWindow config

```js
new BrowserWindow({
  width: 320,
  height: 480,
  frame: false,
  resizable: false,
  alwaysOnTop: true,
  vibrancy: 'hud',
  backgroundColor: '#00000000',
  show: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'panel-preload.js'),
  },
})
```

### Posicionamiento

```js
const trayBounds = tray.getBounds();
const windowBounds = panel.getBounds();
const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
const y = trayBounds.y + trayBounds.height + 4; // 4px gap
panel.setPosition(x, y);
```

### Toggle y cierre

- **Tray left-click:** si panel está visible → ocultar. Si oculto → posicionar y mostrar.
- **blur event** del panel → `panel.hide()` (clic fuera = cierra).
- Panel sobrevive durante toda la sesión de la app (no se destruye, solo se muestra/oculta) para preservar el log acumulado.

---

## IPC Contract

### main → panel (push vía `webContents.send`)

```
panel:state   { project: { id, name, phase }, projects: Project[], running: boolean }
              Cuándo: al mostrar el panel, al cambiar de proyecto, al cambiar de fase.

panel:chunk   { text: string, done: boolean }
              Cuándo: cada chunk que emite pty.js (streaming de Claude).

panel:status  { status: 'running' | 'stopped' }
              Cuándo: al iniciar/detener Claude.
```

### panel → main (invoke vía `ipcRenderer.invoke`)

```
panel:advance-phase   (projectId: string, nextPhase: number) → void
                      Llama updateProjectPhase() existente. Misma función que usa el iPhone.

panel:open-terminal   (projectId: string) → void
                      Abre Terminal con `cd <dir> && claude`. Ya existe en main.js.

panel:switch-project  (projectId: string) → void
                      Cambia proyecto activo. Ya existe en main.js.
```

### panel-preload.js API expuesta

```js
contextBridge.exposeInMainWorld('cc', {
  onState:       (cb) => ipcRenderer.on('panel:state',  (_, d) => cb(d)),
  onChunk:       (cb) => ipcRenderer.on('panel:chunk',  (_, d) => cb(d)),
  onStatus:      (cb) => ipcRenderer.on('panel:status', (_, d) => cb(d)),
  advance:       (projectId, phase) => ipcRenderer.invoke('panel:advance-phase', projectId, phase),
  openTerminal:  (projectId)        => ipcRenderer.invoke('panel:open-terminal',  projectId),
  switchProject: (id)               => ipcRenderer.invoke('panel:switch-project', id),
})
```

---

## UI Layout (320×480px)

```
┌──────────────────────────────────┐
│ ▣ CC Creator          [×]        │  44px — header + drag region + close
│──────────────────────────────────│
│ 📁 mi-tienda               ▾     │  40px — proyecto activo + dropdown switch
│──────────────────────────────────│
│  ● ● ● ○ ○ ○   Lanzamiento       │  48px — 6 dots + nombre fase
│  Fase 3 de 6                     │
│──────────────────────────────────│
│                                  │
│  Claude: Instalando deps...      │  220px — log streaming, scroll anclado
│  Claude: Schema.sql creado       │          al fondo durante streaming
│  Sistema: Deploy en proceso      │
│  Claude: ✓ URL lista             │
│                                  │
│──────────────────────────────────│
│  [⌘ Terminal]  [Avanzar: Fase 4→]│  52px — action bar
└──────────────────────────────────┘
         ▲ caret apuntando al tray icon
```

---

## Diseño visual

| Elemento | Valor |
|----------|-------|
| Fondo | `rgba(20,20,20,0.85)` + `vibrancy: 'hud'` (blur nativo macOS) |
| Border radius | `12px` |
| Dot activa | `#f04e23` (brand orange) |
| Dot inactiva | `rgba(255,255,255,0.2)` |
| Texto log assistant | `#f04e23` |
| Texto log sistema | `rgba(255,255,255,0.4)` |
| Fuente log | `'SF Mono', 'Menlo', monospace`, `12px` |
| Botón Avanzar | `background: #f04e23`, deshabilitado si `running === true` o `phase === 6` |
| Botón Terminal | ghost, borde `rgba(255,255,255,0.15)` |
| Caret top | triángulo SVG, `fill: rgba(20,20,20,0.85)`, centrado sobre el tray icon |

---

## Comportamiento del log

- El área de log acumula todos los chunks de la sesión actual.
- `scrollTop = scrollHeight` se aplica en cada chunk mientras el usuario no haya scrolleado hacia arriba manualmente.
- Si el usuario scrollea hacia arriba, el auto-scroll se pausa. Reaparece un badge "↓ nuevo output" que al hacer clic restaura el anclado.
- Al cambiar de proyecto, el log se limpia.
- Máximo 500 líneas en memoria (ring buffer) para evitar crecimiento ilimitado.

---

## Comportamiento del botón Avanzar

- **Deshabilitado** cuando: `running === true` (Claude activo) O `phase >= 6`.
- **Label dinámico:** "Avanzar a Fase X →" donde X = `phase + 1` con nombre de fase.
- Al hacer clic: `cc.advance(project.id, phase + 1)` → main llama `updateProjectPhase()` → emite `panel:state` actualizado → dots y label se actualizan.
- La misma operación se sincroniza al iPhone vía Supabase (comportamiento ya existente en main.js).

---

## Cambio en main.js (síntesis)

```js
// 1. Al crear el tray:
import { createPanel, togglePanel, sendToPanel } from './panel-window.js';
const panel = createPanel();
tray.on('click', () => togglePanel(panel, tray));

// 2. Al mostrar el panel:
// panel-window.js llama sendToPanel(panel, 'panel:state', { project, projects, running })

// 3. En pty.onChunk (ya existe como onMessage):
pty.onChunk = (text, done) => {
  bridge?.broadcastChunk(...);
  sendToPanel(panel, 'panel:chunk', { text, done });
};

// 4. En broadcastProjects():
sendToPanel(panel, 'panel:state', { project: getActive(), projects: listProjects(), running: !!pty.running });

// 5. Nuevos ipcMain handlers:
ipcMain.handle('panel:advance-phase', (_, projectId, phase) => updateProjectPhase(projectId, phase));
ipcMain.handle('panel:open-terminal', (_, projectId) => openInTerminal(projectId));
ipcMain.handle('panel:switch-project', (_, id) => switchProject(id));
```

---

## Tray interaction (Opción C)

El tray icon mantiene el mismo comportamiento de clic izquierdo y derecho — ambos siguen abriendo el menú de contexto existente (Iniciar/Detener, Copiar código, Actualizar, Salir). El panel se abre desde el **primer ítem del menú**: "📊 Abrir panel →".

Adicionalmente, el panel incluye un botón `···` en el header que despliega `tray.popUpContextMenu(buildMenu(status))` — acceso al menú completo desde dentro del panel sin cerrarlo.

Esto elimina la necesidad de recordar izquierdo vs derecho. Un solo flujo: clic en ícono → menú → "Abrir panel".

---

## Hint de primer uso

La primera vez que el panel se abre, aparece un strip de onboarding animado sobre el action bar:

```
│──────────────────────────────────│
│ 💡 Clic en ▣ CC Creator abre    │  ← strip #f04e23, texto blanco
│    este panel · ··· para más    │    slide-up animado
│    opciones                  [×] │
│──────────────────────────────────│
```

### Comportamiento
- Aparece con `slide-up` (200ms ease-out) al renderizar el panel por primera vez
- Se cierra con `×` o automáticamente después de 8 segundos (fade-out 300ms)
- Flag persistido en `~/.config/cc-controller/panel-seen` (archivo vacío — su existencia es el flag)
- Si el archivo existe al abrir el panel → strip no se renderiza
- Si no existe → strip visible, al cerrarlo se crea el archivo

### Código de verificación en panel-window.js
```js
import { existsSync, writeFileSync } from 'fs';
const flagPath = path.join(homedir(), '.config', 'cc-controller', 'panel-seen');
const isFirstOpen = !existsSync(flagPath);
// Enviado al panel como parte de panel:state: { ..., firstOpen: isFirstOpen }
// Al cerrarse el hint, el panel invoca panel:mark-seen → main crea el archivo
```

---

## Constraints

- Panel no aparece en el Dock ni en cmd+tab (`skipTaskbar: true` implícito por `frame: false` + `alwaysOnTop`).
- No se crea lógica de negocio nueva — solo se expone la existente a un nuevo consumidor.
- El panel no reemplaza ninguna funcionalidad del iPhone; toda operación del panel también ocurre vía Supabase y llega al iPhone.
- Compatible con Apple Silicon e Intel (no hay código nativo adicional).
