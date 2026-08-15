<p align="center">
  <img src="logos/logoccc2.svg" alt="CC Creator" width="160"/>
</p>

# CC Creator — Studio de Apps Directas guiado por Claude

De la idea a tu App Directa en 6 fases. CC Creator envuelve Claude Code en un proceso estructurado: guía a Claude fase a fase, escribe el `CLAUDE.md` automáticamente y te deja controlar todo desde tu iPhone.

```
iPhone (App Directa)  ──── Supabase Realtime ────  Mac (Electron tray)
  Escribe prompt                                      claude CLI
  Avanza de fase          ──────►                    CLAUDE.md automático
  Ve streaming            ◄──────                    Output token a token
```

**Sin cuenta Supabase propia. Sin SSH. Sin túneles. Sin config de red.**

---

## Sistema de 6 Fases

| # | Fase | Objetivo |
|---|------|----------|
| 1 | **Ideación** | Definir el problema, usuarios, y alcance del MVP |
| 2 | **POC Local** | Construir el prototipo funcional en local |
| 3 | **Lanzamiento** | Deploy, dominio y pipeline de CI/CD |
| 4 | **Backend** | Base de datos, auth, APIs y servicios externos |
| 5 | **App Directa Completa** | PWA instalable con offline, push y UX nativa |
| 6 | **Validación** | Métricas, feedback de usuarios y decisiones de producto |

Cada avance de fase escribe un `CLAUDE.md` actualizado en el proyecto. Claude Code lo lee nativamente — sin copiar contexto, sin instrucciones manuales.

---

## Requisitos

- **Mac** con macOS 12+ (Apple Silicon o Intel)
- **Claude Code CLI** instalado: `npm install -g @anthropic-ai/claude-code`
- Suscripción activa a Claude (Max o Pro — requerida por el CLI)
- iPhone o cualquier móvil con navegador moderno

---

## Instalación

### Homebrew (recomendado)

```bash
brew install --cask kitifica-max/tap/cc-controller
```

macOS no bloqueará la app instalada vía Homebrew.

### DMG manual

Desde [GitHub Releases](https://github.com/kitifica-max/cc-controller/releases/latest):

| Chip | Archivo |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `CC.Creator-*-arm64.dmg` |
| Intel | `CC.Creator-*.dmg` |

> **DMG sin firmar:** clic derecho → *Abrir* → confirmar. Solo una vez. Ver [Seguridad](#seguridad).

Arrastra CC Creator a Applications. Al abrir, aparece en el tray (barra superior) sin ícono en el Dock.

---

## Setup inicial

La primera vez, CC Creator abre el asistente de configuración:

1. Ingresa tu correo y contraseña — la misma cuenta que usas en la App Directa
2. Genera un `SESSION_ID` único para tu instalación
3. Genera un `SESSION_TOKEN` aleatorio (mín. 32 chars)
4. Muestra el **código de emparejamiento** (`sessionId:token`)
5. Guarda la config en `~/.config/cc-controller/.env` y la sesión en `~/.config/cc-controller/auth.json`

### Conectar tu iPhone

1. Abre [ccc.kitifica.com](https://ccc.kitifica.com) en Safari
2. Agrega a la pantalla de inicio (Share → Add to Home Screen)
3. Pega el código de emparejamiento cuando la App Directa lo solicite
4. En el tray → clic derecho → **Iniciar**

---

## Uso diario

### Proyectos y fases

- Toca el nombre del proyecto en el header → lista de proyectos
- **Nuevo proyecto:** CC Creator crea `~/CCProjects/<slug>/` en el Mac
- **Avanzar de fase:** toca el indicador de fase → panel de fases → selecciona la siguiente
- CC Creator escribe el `CLAUDE.md` del proyecto al cambiar de fase
- **Abrir en Claude Code:** botón en el header → abre Terminal con `cd <proyecto> && claude`

### Secrets por categoría

Settings (⚙️) → Secrets. Las claves se organizan por categoría (API Keys, Database, Auth, etc.) y se guardan en:

```
~/CCProjects/<proyecto>/.env
```

con permisos `600`. Nunca se almacenan en la App Directa ni en Supabase.

### Subir archivos desde iPhone

Toca el ícono de clip. El archivo viaja a Supabase Storage temporalmente, el desktop lo descarga al directorio del proyecto y lo elimina de Storage inmediatamente.

Formatos: `.png .jpg .jpeg .gif .pdf .txt .md .json .csv .svg .zip` (máx. 10 MB)

---

## Seguridad

| Medida | Detalle |
|---|---|
| **Canal privado** | El canal `session:<id>` es privado: Supabase evalúa RLS sobre `realtime.messages` con el JWT de tu cuenta. Sin sesión autorizada no hay suscripción. |
| **Código de emparejamiento** | `SESSION_ID` único por instalación + `SESSION_TOKEN` ≥ 32 chars. Segunda capa: sin ese par exacto, cualquier evento se descarta. |
| **Sin puertos abiertos** | El Mac no escucha en ningún puerto. Todo viaja por Supabase WebSocket (WSS/TLS). Sin SSH, sin ngrok. |
| **Path traversal bloqueado** | Toda ruta de archivo se valida dentro de `~/CCProjects/`. Paths con `../` rechazados. |
| **Whitelist de archivos** | Solo extensiones permitidas, máx. 10 MB. Eliminado de Storage tras descargarse. |
| **Secretos con permisos 600** | `.env` de cada proyecto escrito con `mode 0o600`. |
| **Hardened Runtime** | `hardenedRuntime: true` en el build de Electron. |
| **Open source** | Todo el código está en GitHub. Sin binarios opacos. |

> Si pierdes el iPhone: cambia `SESSION_TOKEN` en `~/.config/cc-controller/.env` y reinicia CC Creator. El dispositivo anterior no puede reconectar.

---

## Arquitectura

```
desktop/src/
├── main.js          # Entry point — tray, setup, event wiring, powerSaveBlocker
├── bridge.js        # Supabase Realtime bridge (broadcast + storage)
├── pty.js           # Claude CLI runner (child_process + streaming)
├── projects.js      # ProjectManager (~/.config + ~/CCProjects)
├── claude-md.js     # Generador de CLAUDE.md por fase
└── setup-window.js  # Wizard de primer setup

web/app/
├── page.js                    # Chat UI principal con streaming
└── components/
    ├── AuthGate.js            # Emparejamiento de código
    ├── PhasePanel.js          # Visualización y cambio de fase
    ├── SecretsSheet.js        # Secrets por categoría
    ├── SettingsSheet.js       # Modelo, effort, proyectos
    ├── ProjectsList.js        # Lista y gestión de proyectos
    └── FileUpload.js          # Subida de archivos
```

| Componente | Tecnología | Rol |
|---|---|---|
| Desktop | Electron 30 + Node.js | Ejecuta `claude` CLI, gestiona fases y CLAUDE.md |
| App Directa | Next.js 14 + Netlify | Control remoto e interfaz de fases desde el móvil |
| Bridge | Supabase Realtime (Broadcast) | Canal WebSocket cifrado entre ambos |
| Storage | Supabase Storage (`uploads`) | Tránsito temporal de archivos |

Supabase está **bundled** — los devs no necesitan cuenta propia.

---

## Desarrollo local

```bash
# Desktop
cd desktop && npm install && npm run dev

# App Directa
cd web && npm install && npm run dev
```

### Construir DMG

```bash
cd desktop
# Apple Silicon
npm run build -- --mac --arm64

# Intel
npm run build -- --mac --x64
```

Los DMGs quedan en `desktop/dist/`.

---

## Solución de problemas

**"Desktop detenido" en la App Directa aunque Electron corra**
→ Electron envía heartbeat cada 20s. Si la App Directa no recibe uno en 45s, marca el desktop como detenido. Clic derecho en tray → Iniciar.

**"no se puede abrir porque proviene de un desarrollador no identificado"**
→ Instala vía Homebrew (sin este problema) o clic derecho → Abrir → confirmar.

**La App Directa pide código de emparejamiento otra vez**
→ El localStorage fue borrado. Abre CC Creator → clic derecho → Copiar código de emparejamiento.

**La respuesta de Claude tiene caracteres extraños (`[0m`, `[31m`)**
→ El bridge filtra ANSI automáticamente. Si persisten, actualiza a la versión más reciente.

**El Mac se duerme y la sesión se cae**
→ CC Creator activa `prevent-display-sleep` automáticamente mientras la sesión corre.

---

## Licencia

[MIT](LICENSE)
