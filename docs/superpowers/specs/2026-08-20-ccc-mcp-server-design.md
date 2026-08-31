# CCC MCP Server — Design

**Date:** 2026-08-20
**Status:** Approved — pending implementation plan

## Goal

Reemplazar el bridge actual (Electron + Supabase Realtime channel privado) con un MCP server hosteado en cloud que conecta la PWA con Claude Code Desktop via protocolo MCP estándar. El resultado: usuarios no-devs pueden capturar su idea en la PWA y ver el build en tiempo real sin instalar ninguna app de Mac.

## Architecture

```
┌─────────────────┐     REST + Supabase Realtime     ┌──────────────────────┐
│   PWA / Mobile  │ ←──────────────────────────────→  │  CCC MCP Server      │
│  (Next.js)      │                                   │  (Node.js + Hono)    │
└─────────────────┘                                   │                      │
                                                      │  • Session store     │
                                                      │  • MCP protocol      │
                                                      │  • Supabase writes   │
                                                      └──────────┬───────────┘
                                                                 │ MCP (HTTP)
                                                      ┌──────────▼───────────┐
                                                      │  Claude Code Desktop │
                                                      └──────────────────────┘
```

**Stack del MCP server:**
- Runtime: Node.js 20+
- Framework HTTP: Hono (lightweight, edge-compatible)
- MCP SDK: `@modelcontextprotocol/sdk`
- Storage: Supabase (briefs + events) — reutiliza infra existente
- Realtime: Supabase Realtime — la PWA se suscribe al canal `session:{id}`
- Deploy: Netlify Functions (REST endpoints) — no SSE nativo, Supabase cubre eso

## Global Constraints

- No commits a GitHub durante implementación — deploy via `netlify deploy --prod`
- Supabase existente del proyecto como única base de datos
- Compatibilidad con Claude Code Desktop (MCP HTTP transport)
- El `claude mcp add` se corre **una sola vez** por usuario — la API key es permanente
- Sin Electron — el desktop app queda deprecated
- Sin cambios al formato de BRIEF.md ni a los tipos de nodo del canvas

---

## Components

### 1. MCP Server

Proceso Node.js/Hono que implementa el MCP HTTP transport. Vive en `mcp/` en el repo.

Dos responsabilidades:
- Manejar llamadas MCP de Claude Code (`/mcp` endpoint)
- Manejar REST calls de la PWA (`/api/*` endpoints)

```
mcp/
  index.js          ← entry point, monta Hono app
  tools.js          ← definición de los 5 MCP tools
  sessions.js       ← lógica de sesiones (CRUD en Supabase)
  auth.js           ← validación de API key + session_id
  realtime.js       ← escritura a Supabase Realtime
```

### 2. MCP Tools

Cinco tools expuestos a Claude Code. Todos autenticados vía `CCC_API_KEY` (env var en Claude Code) + `session_id` leído del `CLAUDE.md` del proyecto.

```typescript
read_brief(session_id: string): string
// Retorna el contenido completo de BRIEF.md almacenado para esta sesión.
// Claude lo escribe como BRIEF.md en el directorio del proyecto.

get_project_config(session_id: string): {
  name: string
  stack: string
  platform: string
  constraints: string
  audience: string
}
// Config estructurada extraída del brief para uso programático.

update_status(session_id: string, phase: string, message: string): void
// phases: "planning" | "scaffolding" | "building" | "styling" | "running"
// Escribe un evento en Supabase Realtime → PWA lo recibe en tiempo real.

notify_preview(session_id: string, url: string, port: number): void
// Claude llama esto cuando el dev server arranca.
// La PWA muestra el link y el puerto al usuario.

complete_session(session_id: string, summary: string): void
// Marca la sesión como completada.
// La PWA muestra el estado "Tu app está lista".
```

### 3. REST API (para la PWA)

```
POST   /api/sessions
       Body:    { project_name: string }
       Headers: Authorization: Bearer {CCC_API_KEY}
       Returns: { session_id }

PUT    /api/sessions/:id/brief
       Body:    { content: string }   // BRIEF.md completo
       Headers: Authorization: Bearer {CCC_API_KEY}
       Returns: { ok: true }

GET    /api/sessions/:id
       Headers: Authorization: Bearer {CCC_API_KEY}
       Returns: { session_id, status, phase, preview_url, created_at }

DELETE /api/sessions/:id
       Headers: Authorization: Bearer {CCC_API_KEY}
       Returns: { ok: true }
```

El SSE de progreso **no** pasa por REST — la PWA se suscribe directamente a Supabase Realtime en el canal `session:{session_id}`. El MCP server escribe a ese canal via `update_status` / `notify_preview` / `complete_session`.

### 4. Auth

**Setup único por usuario:**
```bash
claude mcp add cc-creator \
  --transport http \
  --env CCC_API_KEY=uk_... \
  "https://mcp.ccc.app/mcp"
```

La `CCC_API_KEY` se genera en la PWA (perfil de usuario) y se almacena en Supabase `users` table. Claude Code la guarda en su config local y la envía como env var en cada tool call.

**Validación en cada request:**
1. MCP server recibe `CCC_API_KEY` del header/env
2. Busca el user en Supabase por esa key
3. Verifica que `session_id` pertenezca a ese user
4. Si no: 401

**Schema Supabase mínimo:**
```sql
-- usuarios y sus API keys
users (id, api_key, created_at)

-- sesiones de build
sessions (
  id, user_id, project_name,
  brief_content, status, phase,
  preview_url, summary,
  created_at, completed_at
)
```

---

## Session Lifecycle

```
1. PWA: POST /api/sessions → recibe session_id
2. PWA: PUT /api/sessions/:id/brief → sube BRIEF.md
3. PWA: suscribe a Supabase Realtime canal "session:{id}"
4. PWA: muestra pantalla "Abre Claude Code"
         → si es primera vez: muestra el claude mcp add command
         → si ya configurado: muestra "Claude Code detectará tu proyecto automáticamente"

5. Usuario abre Claude Code Desktop en la carpeta del proyecto
6. CLAUDE.md del proyecto contiene:
   ## CCC Session
   session_id: sess_xyz

7. Claude Code: lee CLAUDE.md → llama read_brief(sess_xyz)
8. MCP server: fetch brief de Supabase → retorna a Claude Code
9. Claude Code: escribe BRIEF.md en el proyecto → construye

10. Durante build:
    Claude Code → update_status(id, "building", "Creando componentes...")
    MCP server → escribe a Supabase Realtime
    PWA ← recibe evento → muestra progreso

11. Claude Code → notify_preview(id, "http://localhost:3000", 3000)
    PWA ← muestra link del preview

12. Claude Code → complete_session(id, "POC listo con 3 pantallas")
    PWA ← muestra "Tu app está lista 🎉"
```

---

## PWA Changes

**Se elimina:**
- `lib/bridge.js` (Supabase Realtime bridge actual con canal privado)
- Toda referencia a `getSessionId()` / `getSessionToken()` del bridge
- La pantalla de "conectar" del Electron app

**Se agrega:**
- `lib/mcp-client.js` — wrapper sobre los endpoints REST del MCP server
- Pantalla de onboarding "Conecta Claude Code" con el `claude mcp add` command (solo primera vez)
- Panel de progreso en tiempo real (fases + mensajes) usando Supabase Realtime
- Pantalla "Tu app está lista" con preview URL
- Sección de API key en perfil de usuario (para generar / copiar `CCC_API_KEY`)

**No cambia:**
- Canvas de concepto y todos los tipos de nodo
- BriefingModal y preguntas
- Formato de BRIEF.md generado
- Skills (ui-ux-pro-max, iconifika)
- Landing page

---

## Deployment

**MCP server:**
- Directorio: `mcp/` en el repo
- Deploy: `netlify deploy --prod` desde CLI (sin GitHub CI)
- Las funciones REST viven como Netlify Functions en `mcp/netlify/functions/`
- Variables de entorno en Netlify: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

**PWA:**
- Sin cambios de deploy — sigue con `netlify deploy --prod` en `web/`
- Agrega: `MCP_SERVER_URL=https://mcp.ccc.app` como env var

**Lo que se depreca:**
- `desktop/` — el Electron app queda archivado, sin nuevas releases

---

## Out of Scope

- Multi-usuario en la misma sesión (colaboración)
- Histórico de sesiones en la PWA
- Webhooks de Netlify o GitHub Actions
- Migración de usuarios existentes del Electron app
