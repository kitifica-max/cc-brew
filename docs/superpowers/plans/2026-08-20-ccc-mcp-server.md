# CCC MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el bridge Electron+Supabase Realtime con un MCP server hosteado en Netlify que conecta la PWA con Claude Code Desktop.

**Architecture:** MCP server Node.js en `mcp/` como Netlify Functions. PWA llama REST API. Claude Code llama MCP tools (JSON-RPC sobre HTTP). Supabase Realtime (canal público) envía progreso a la PWA.

**Tech Stack:** Node.js 20+, Supabase JS SDK, Netlify Functions (ESM), Supabase Realtime

**Spec:** `docs/superpowers/specs/2026-08-20-ccc-mcp-server-design.md`

## Global Constraints

- Sin commits a GitHub — solo local. Deploy via `netlify deploy --prod`
- Supabase existente como única base de datos (reutilizar URL/keys del `.env`)
- MCP server en `mcp/` desplegado como sitio Netlify separado (distinto de `web/`)
- `web/` (PWA) sigue en el sitio Netlify existente — no crear sitio nuevo
- MCP protocol: JSON-RPC 2.0 sobre HTTP POST — implementar sin SDK de transport
- Sin Electron — `desktop/` no se toca
- Formato BRIEF.md sin cambios
- No breaking changes en auth de Supabase existente (`web/app/lib/supabase.js` se mantiene)

---

### Task 1: Supabase schema migration

**Files:**
- Create: `supabase/migrations/20260820_ccc_mcp.sql`

**Interfaces:**
- Produces: tablas `ccc_users` y `ccc_sessions` en Supabase. Las demás tasks las usan vía Supabase JS client.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260820_ccc_mcp.sql

-- Usuarios CCC con API key permanente
create table if not exists public.ccc_users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid references auth.users(id) on delete cascade unique,
  api_key text unique not null default concat('uk_', replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz default now()
);

-- Sesiones de build
create table if not exists public.ccc_sessions (
  id text primary key,
  user_id uuid references public.ccc_users(id) on delete cascade not null,
  project_name text not null,
  brief_content text,
  status text not null default 'pending',
  phase text,
  preview_url text,
  summary text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- RLS
alter table public.ccc_users enable row level security;
alter table public.ccc_sessions enable row level security;

-- Usuarios leen su propio registro
create policy "users_read_own" on public.ccc_users
  for select using (supabase_user_id = auth.uid());

-- Usuarios leen sus propias sesiones
create policy "sessions_read_own" on public.ccc_sessions
  for select using (
    user_id in (select id from public.ccc_users where supabase_user_id = auth.uid())
  );

-- Service key bypasa RLS (el MCP server usa SUPABASE_SERVICE_KEY)
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Ir al Supabase dashboard → SQL Editor → pegar y ejecutar el contenido del archivo.

Verificar que las tablas aparezcan en Table Editor: `ccc_users` y `ccc_sessions`.

- [ ] **Step 3: Habilitar Realtime para ccc_sessions**

En Supabase dashboard → Database → Replication → Habilitar `ccc_sessions` en la tabla o usar Broadcast channels (que no requieren replicación de tabla).

> Nota: usamos Supabase Broadcast (no Postgres changes), así que no es necesario habilitar replicación. El MCP server llama `channel.send()` y la PWA recibe. Sin cambios en Replication settings.

- [ ] **Step 4: Crear registro de usuario de prueba manualmente**

En SQL Editor:
```sql
-- Insertar usuario de prueba con tu supabase_user_id real
-- Reemplazar el UUID con el tuyo (ver auth.users en Supabase dashboard)
insert into public.ccc_users (supabase_user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict do nothing;

-- Verificar que se generó api_key
select api_key from public.ccc_users limit 1;
```

Guardar el `api_key` resultante — se usa en Task 3 para el `curl` de prueba.

- [ ] **Step 5: Commit local**

```bash
git add supabase/migrations/20260820_ccc_mcp.sql
git commit -m "feat(mcp): supabase schema — ccc_users + ccc_sessions"
```

---

### Task 2: MCP server — lib layer

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/lib/db.js`
- Create: `mcp/lib/auth.js`
- Create: `mcp/lib/sessions.js`
- Create: `mcp/lib/realtime.js`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` env vars
- Produces:
  - `validateApiKey(apiKey: string): Promise<string|null>` — retorna `user_id` o `null`
  - `validateSession(sessionId: string, userId: string): Promise<boolean>`
  - `createSession(userId: string, projectName: string): Promise<string>` — retorna `session_id`
  - `updateSession(sessionId: string, data: object): Promise<void>`
  - `getSession(sessionId: string, userId: string): Promise<object|null>`
  - `deleteSession(sessionId: string, userId: string): Promise<void>`
  - `broadcastEvent(sessionId: string, eventType: string, payload: object): Promise<void>`

- [ ] **Step 1: Crear package.json**

```json
{
  "name": "cc-creator-mcp",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd mcp && npm install
```

Verificar que `node_modules/@supabase` existe.

- [ ] **Step 3: Crear mcp/lib/db.js**

```javascript
// mcp/lib/db.js
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)
```

- [ ] **Step 4: Crear mcp/lib/auth.js**

```javascript
// mcp/lib/auth.js
import { supabase } from './db.js'

export async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('uk_')) return null
  const { data } = await supabase
    .from('ccc_users')
    .select('id')
    .eq('api_key', apiKey)
    .single()
  return data?.id ?? null
}

export async function validateSession(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export function extractApiKey(headers) {
  const auth = headers['authorization'] ?? headers['Authorization'] ?? ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return headers['x-api-key'] ?? headers['X-Api-Key'] ?? ''
}
```

- [ ] **Step 5: Crear mcp/lib/sessions.js**

```javascript
// mcp/lib/sessions.js
import { supabase } from './db.js'

function newSessionId() {
  return 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export async function createSession(userId, projectName) {
  const id = newSessionId()
  const { error } = await supabase.from('ccc_sessions').insert({
    id,
    user_id: userId,
    project_name: projectName,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
  return id
}

export async function uploadBrief(sessionId, userId, content) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ brief_content: content, status: 'ready' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getSession(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function updateSessionFields(sessionId, fields) {
  await supabase
    .from('ccc_sessions')
    .update(fields)
    .eq('id', sessionId)
}

export async function deleteSession(sessionId, userId) {
  await supabase
    .from('ccc_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
}

export async function getBrief(sessionId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('brief_content, project_name, status')
    .eq('id', sessionId)
    .single()
  return data
}
```

- [ ] **Step 6: Crear mcp/lib/realtime.js**

```javascript
// mcp/lib/realtime.js
import { supabase } from './db.js'

export async function broadcastEvent(sessionId, eventType, payload) {
  const channel = supabase.channel(`session:${sessionId}`)
  // Conectar, enviar, desconectar (fire-and-forget en Netlify Function)
  await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: eventType,
          payload,
        }).then(() => {
          supabase.removeChannel(channel)
          resolve()
        })
      }
    })
  })
}
```

- [ ] **Step 7: Verificar que los módulos importan sin errores**

```bash
cd mcp && node --input-type=module <<'EOF'
import { validateApiKey } from './lib/auth.js'
import { broadcastEvent } from './lib/realtime.js'
console.log('imports ok')
EOF
```

Esperado: `imports ok` (puede fallar si no hay env vars — está bien, solo verifica sintaxis).

- [ ] **Step 8: Commit local**

```bash
git add mcp/
git commit -m "feat(mcp): lib layer — auth, sessions, realtime"
```

---

### Task 3: MCP tools + Netlify Functions

**Files:**
- Create: `mcp/lib/tools.js`
- Create: `mcp/netlify/functions/mcp.mjs`
- Create: `mcp/netlify/functions/sessions.mjs`
- Create: `mcp/netlify.toml`

**Interfaces:**
- Consumes: todo lo de Task 2 (`auth.js`, `sessions.js`, `realtime.js`)
- Produces:
  - `POST /mcp` → MCP JSON-RPC endpoint (para Claude Code)
  - `POST /api/sessions` → crea sesión
  - `PUT /api/sessions/:id/brief` → sube brief
  - `GET /api/sessions/:id` → estado de sesión
  - `DELETE /api/sessions/:id` → elimina sesión

- [ ] **Step 1: Crear mcp/lib/tools.js — definiciones y handler JSON-RPC**

```javascript
// mcp/lib/tools.js
import { validateApiKey, validateSession, extractApiKey } from './auth.js'
import { getBrief, updateSessionFields } from './sessions.js'
import { broadcastEvent } from './realtime.js'

// Definiciones de tools para el método tools/list
export const TOOL_DEFINITIONS = [
  {
    name: 'read_brief',
    description: 'Lee el BRIEF.md del proyecto desde la sesión CCC. Llama esto primero al iniciar.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'ID de sesión de CCC' } },
      required: ['session_id'],
    },
  },
  {
    name: 'get_project_config',
    description: 'Retorna configuración estructurada: nombre, stack, plataforma.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
  {
    name: 'update_status',
    description: 'Reporta progreso del build a la PWA del usuario.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        phase: { type: 'string', enum: ['planning', 'scaffolding', 'building', 'styling', 'running'] },
        message: { type: 'string' },
      },
      required: ['session_id', 'phase', 'message'],
    },
  },
  {
    name: 'notify_preview',
    description: 'Notifica a la PWA que el dev server está corriendo.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        url: { type: 'string' },
        port: { type: 'number' },
      },
      required: ['session_id', 'url', 'port'],
    },
  },
  {
    name: 'complete_session',
    description: 'Marca el build como completado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['session_id', 'summary'],
    },
  },
]

// Implementaciones de cada tool
async function read_brief({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getBrief(session_id)
  if (!data?.brief_content) throw new Error('Brief not uploaded yet')
  return { content: [{ type: 'text', text: data.brief_content }] }
}

async function get_project_config({ session_id }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  const data = await getBrief(session_id)
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ name: data.project_name, status: data.status }),
    }],
  }
}

async function update_status({ session_id, phase, message }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, { phase, status: 'building' })
  await broadcastEvent(session_id, 'status', { phase, message })
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function notify_preview({ session_id, url, port }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, { preview_url: url, phase: 'running' })
  await broadcastEvent(session_id, 'preview', { url, port })
  return { content: [{ type: 'text', text: 'ok' }] }
}

async function complete_session({ session_id, summary }, userId) {
  if (!await validateSession(session_id, userId)) throw new Error('Session not found')
  await updateSessionFields(session_id, {
    status: 'done',
    summary,
    completed_at: new Date().toISOString(),
  })
  await broadcastEvent(session_id, 'complete', { summary })
  return { content: [{ type: 'text', text: 'ok' }] }
}

const TOOLS = { read_brief, get_project_config, update_status, notify_preview, complete_session }

// Handler JSON-RPC principal — exportado para Netlify Function
export async function mcpJsonRpcHandler(event) {
  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { method, params, id } = body

  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'cc-creator', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return ok(id, { tools: TOOL_DEFINITIONS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params
    const fn = TOOLS[name]
    if (!fn) return err(id, -32601, `Unknown tool: ${name}`)
    try {
      const result = await fn(args, userId)
      return ok(id, result)
    } catch (e) {
      return err(id, -32000, e.message)
    }
  }

  return err(id, -32601, `Unknown method: ${method}`)
}

function ok(id, result) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, result }),
  }
}

function err(id, code, message) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
  }
}
```

- [ ] **Step 2: Crear mcp/netlify/functions/mcp.mjs**

```javascript
// mcp/netlify/functions/mcp.mjs
import { mcpJsonRpcHandler } from '../../lib/tools.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  return mcpJsonRpcHandler(event)
}
```

- [ ] **Step 3: Crear mcp/netlify/functions/sessions.mjs**

```javascript
// mcp/netlify/functions/sessions.mjs
import { validateApiKey, extractApiKey } from '../../lib/auth.js'
import { createSession, uploadBrief, getSession, deleteSession } from '../../lib/sessions.js'

export async function handler(event) {
  const apiKey = extractApiKey(event.headers)
  const userId = await validateApiKey(apiKey)
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }

  const { httpMethod, path, body: rawBody } = event
  // path: /api/sessions o /api/sessions/sess_xxx o /api/sessions/sess_xxx/brief
  const parts = path.replace(/^\/api\/sessions\/?/, '').split('/')
  const sessionId = parts[0] || null
  const sub = parts[1] || null  // 'brief' o undefined

  try {
    // POST /api/sessions — crear sesión
    if (httpMethod === 'POST' && !sessionId) {
      const { project_name } = JSON.parse(rawBody ?? '{}')
      if (!project_name) return { statusCode: 400, body: JSON.stringify({ error: 'project_name required' }) }
      const session_id = await createSession(userId, project_name)
      return json({ session_id })
    }

    // PUT /api/sessions/:id/brief — subir brief
    if (httpMethod === 'PUT' && sessionId && sub === 'brief') {
      const { content } = JSON.parse(rawBody ?? '{}')
      if (!content) return { statusCode: 400, body: JSON.stringify({ error: 'content required' }) }
      await uploadBrief(sessionId, userId, content)
      return json({ ok: true })
    }

    // GET /api/sessions/:id — estado
    if (httpMethod === 'GET' && sessionId) {
      const data = await getSession(sessionId, userId)
      if (!data) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
      return json(data)
    }

    // DELETE /api/sessions/:id
    if (httpMethod === 'DELETE' && sessionId) {
      await deleteSession(sessionId, userId)
      return json({ ok: true })
    }

    return { statusCode: 404, body: 'Not found' }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}

function json(data) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
}
```

- [ ] **Step 4: Crear mcp/netlify.toml**

```toml
[build]
  command = "npm install"
  publish = "."

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  included_files = ["lib/**"]

[[redirects]]
  from = "/mcp"
  to = "/.netlify/functions/mcp"
  status = 200

[[redirects]]
  from = "/api/sessions"
  to = "/.netlify/functions/sessions"
  status = 200

[[redirects]]
  from = "/api/sessions/*"
  to = "/.netlify/functions/sessions"
  status = 200
```

- [ ] **Step 5: Verificar sintaxis de todos los archivos**

```bash
cd mcp && node --check lib/tools.js lib/auth.js lib/sessions.js lib/realtime.js netlify/functions/mcp.mjs netlify/functions/sessions.mjs
```

Esperado: sin output (sin errores).

- [ ] **Step 6: Deploy del MCP server a Netlify**

```bash
cd mcp
# Primera vez — crear nuevo sitio Netlify
netlify init
# Nombre sugerido: cc-creator-mcp

# Setear env vars (reemplazar con valores reales)
netlify env:set SUPABASE_URL "https://xxx.supabase.co"
netlify env:set SUPABASE_SERVICE_KEY "eyJ..."

# Deploy
netlify deploy --prod
```

Anotar la URL del sitio: `https://cc-creator-mcp.netlify.app` (o dominio custom).

- [ ] **Step 7: Probar endpoints con curl**

Reemplazar `API_KEY` con el `api_key` del Step 4 de Task 1 y `MCP_URL` con la URL del sitio.

```bash
export API_KEY="uk_..."
export MCP_URL="https://cc-creator-mcp.netlify.app"

# Test: crear sesión
curl -s -X POST "$MCP_URL/api/sessions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"project_name":"Test Project"}' | jq .
# Esperado: { "session_id": "sess_..." }

export SESSION_ID=$(curl -s -X POST "$MCP_URL/api/sessions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"project_name":"Test"}' | jq -r .session_id)

# Test: subir brief
curl -s -X PUT "$MCP_URL/api/sessions/$SESSION_ID/brief" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"# Brief\nApp de prueba"}' | jq .
# Esperado: { "ok": true }

# Test: MCP initialize
curl -s -X POST "$MCP_URL/mcp" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | jq .
# Esperado: { "result": { "protocolVersion": "2024-11-05", ... } }

# Test: tools/list
curl -s -X POST "$MCP_URL/mcp" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | jq '.result.tools[].name'
# Esperado: "read_brief" "get_project_config" "update_status" "notify_preview" "complete_session"

# Test: read_brief
curl -s -X POST "$MCP_URL/mcp" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"read_brief\",\"arguments\":{\"session_id\":\"$SESSION_ID\"}}}" | jq .
# Esperado: { "result": { "content": [{ "type": "text", "text": "# Brief\nApp de prueba" }] } }
```

- [ ] **Step 8: Commit local**

```bash
git add mcp/
git commit -m "feat(mcp): tools + netlify functions + deploy"
```

---

### Task 4: PWA — nuevo lib y componentes

**Files:**
- Create: `web/app/lib/mcp-client.js`
- Create: `web/app/components/OnboardingMCP.js`
- Create: `web/app/components/BuildProgress.js`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_MCP_SERVER_URL` env var, `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` existentes
- Produces:
  - `createSession(projectName)` → `{ session_id }`
  - `uploadBrief(sessionId, content)` → void
  - `<OnboardingMCP apiKey sessionId />` → pantalla "Conecta Claude Code"
  - `<BuildProgress sessionId />` → panel de progreso en tiempo real

- [ ] **Step 1: Crear web/app/lib/mcp-client.js**

```javascript
// web/app/lib/mcp-client.js
const BASE = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? 'https://cc-creator-mcp.netlify.app'
const API_KEY_STORAGE = 'ccc_api_key'

export function getApiKey() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function setApiKey(key) {
  try { localStorage.setItem(API_KEY_STORAGE, key) } catch {}
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
  }
}

export async function createSession(projectName) {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ project_name: projectName }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()  // { session_id }
}

export async function uploadBrief(sessionId, content) {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}/brief`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error('Failed to upload brief')
}

export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  return res.json()
}

export function getMcpAddCommand(apiKey, mcpUrl = BASE) {
  return `claude mcp add cc-creator --transport http --env CCC_API_KEY=${apiKey} "${mcpUrl}/mcp"`
}
```

- [ ] **Step 2: Crear web/app/components/OnboardingMCP.js**

```javascript
// web/app/components/OnboardingMCP.js
'use client'
import { useState } from 'react'
import { getMcpAddCommand } from '../lib/mcp-client'

export default function OnboardingMCP({ apiKey, sessionId, onDone }) {
  const [copied, setCopied] = useState(false)
  const cmd = getMcpAddCommand(apiKey)

  const copy = () => {
    navigator.clipboard.writeText(cmd).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16,
      padding: '24px 20px', maxWidth: 520, margin: '0 auto',
    }}>
      <div style={{ fontSize: 11, color: '#f04e23', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Solo la primera vez
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0', marginBottom: 12 }}>
        Conecta Claude Code
      </div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
        Pega este comando en tu terminal. Solo necesitas hacerlo una vez.
      </p>
      <div style={{
        background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 10,
        padding: '12px 14px', marginBottom: 12, overflowX: 'auto',
      }}>
        <code style={{ fontSize: 11, color: '#E0E0E0', whiteSpace: 'pre', fontFamily: 'monospace' }}>
          {cmd}
        </code>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copy} style={{
          flex: 1, padding: '12px 0', background: copied ? '#10B981' : '#f04e23',
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 700, cursor: 'pointer', transition: 'background 200ms',
        }}>
          {copied ? '✓ Copiado' : 'Copiar comando'}
        </button>
        <button onClick={onDone} style={{
          padding: '12px 16px', background: 'transparent',
          color: '#888', border: '1px solid #2A2A2A', borderRadius: 10,
          fontSize: 13, cursor: 'pointer',
        }}>
          Ya lo hice →
        </button>
      </div>
      {sessionId && (
        <div style={{ marginTop: 16, fontSize: 11, color: '#525252' }}>
          session_id: {sessionId}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Crear web/app/components/BuildProgress.js**

```javascript
// web/app/components/BuildProgress.js
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASE_LABELS = {
  planning: 'Planificando',
  scaffolding: 'Creando estructura',
  building: 'Construyendo',
  styling: 'Aplicando estilos',
  running: 'Servidor listo',
}

export default function BuildProgress({ sessionId, onComplete }) {
  const [events, setEvents] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('broadcast', { event: 'status' }, ({ payload }) => {
        setEvents(prev => [...prev, { ...payload, ts: Date.now() }])
      })
      .on('broadcast', { event: 'preview' }, ({ payload }) => {
        setPreviewUrl(payload.url)
      })
      .on('broadcast', { event: 'complete' }, ({ payload }) => {
        setDone(true)
        setEvents(prev => [...prev, { phase: 'done', message: payload.summary, ts: Date.now() }])
        onComplete?.()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId])

  if (!sessionId) return null

  return (
    <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: '20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
        {done ? 'Listo' : 'Construyendo...'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.length === 0 && (
          <div style={{ fontSize: 13, color: '#525252' }}>Esperando a Claude Code...</div>
        )}
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
              background: e.phase === 'done' ? '#10B981' : '#f04e23',
            }} />
            <div>
              <span style={{ fontSize: 11, color: '#525252', marginRight: 6 }}>
                {PHASE_LABELS[e.phase] ?? e.phase}
              </span>
              <span style={{ fontSize: 13, color: '#E0E0E0' }}>{e.message}</span>
            </div>
          </div>
        ))}
      </div>

      {previewUrl && (
        <a href={previewUrl} target="_blank" rel="noopener" style={{
          display: 'block', marginTop: 16, padding: '12px 16px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 10, color: '#10B981', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', textAlign: 'center',
        }}>
          Ver preview → {previewUrl}
        </a>
      )}

      {done && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#10B981', fontWeight: 600 }}>
          ✓ Tu app está lista
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar que el build de Next.js no rompe**

```bash
cd web && npm run build 2>&1 | tail -20
```

Esperado: sin errores. Los nuevos componentes son `'use client'` y no afectan el build estático.

- [ ] **Step 5: Commit local**

```bash
git add web/app/lib/mcp-client.js web/app/components/OnboardingMCP.js web/app/components/BuildProgress.js
git commit -m "feat(pwa): mcp-client + OnboardingMCP + BuildProgress"
```

---

### Task 5: PWA — wiring + remover bridge + deploy

**Files:**
- Modify: `web/app/page.js`
- Modify: `web/app/components/BriefingModal.js`

**Interfaces:**
- Consumes: `OnboardingMCP`, `BuildProgress`, `mcp-client.js` de Task 4
- Produces: flujo completo funcional — el botón "Construir" crea sesión, sube brief, muestra onboarding + progreso

- [ ] **Step 1: Leer el estado actual de page.js**

```bash
grep -n "bridge\|channel\|write-brief\|session\|getSession\|getToken\|BuildPanel" web/app/page.js
```

Anotar las líneas donde está el bridge actual para saber exactamente qué reemplazar.

- [ ] **Step 2: Actualizar web/app/page.js — reemplazar bridge con MCP client**

Localizar el bloque de `useEffect` que suscribe al canal de Supabase (pattern `supabase.channel(channelName, { config: { private: true } })`).

Reemplazarlo con:

```javascript
// Suscripción a Supabase Realtime para recibir eventos del MCP server
// (sin canal privado — el canal es session:{id} público, auth vía RLS del service key)
// BuildProgress maneja su propia suscripción internamente.
// Este useEffect ya no es necesario — remover completamente.
```

Agregar imports al tope del archivo (después de los existentes):

```javascript
import { createSession as mcpCreateSession, uploadBrief, getApiKey } from './lib/mcp-client'
import OnboardingMCP from './components/OnboardingMCP'
import BuildProgress from './components/BuildProgress'
```

Agregar estado:

```javascript
const [mcpSessionId, setMcpSessionId] = useState(null)
const [showMcpOnboarding, setShowMcpOnboarding] = useState(false)
const [buildActive, setBuildActive] = useState(false)
```

Reemplazar el handler de `onConfirm` en BriefingModal:

```javascript
const handleBriefConfirm = async (briefContent) => {
  setShowBrief(false)
  try {
    const { session_id } = await mcpCreateSession(project.name)
    setMcpSessionId(session_id)
    await uploadBrief(session_id, briefContent)
    // Mostrar onboarding si es primera vez, o ir directo al progreso
    const hasKey = !!getApiKey()
    if (!hasKey) {
      setShowMcpOnboarding(true)
    } else {
      setBuildActive(true)
    }
  } catch (e) {
    console.error('MCP session error:', e)
    // Fallback: mostrar mensaje de error al usuario
  }
}
```

En el JSX, reemplazar `<BuildPanel ... />` con:

```jsx
{showMcpOnboarding && (
  <OnboardingMCP
    apiKey={getApiKey() || '(configura tu api key en ajustes)'}
    sessionId={mcpSessionId}
    onDone={() => { setShowMcpOnboarding(false); setBuildActive(true) }}
  />
)}
{buildActive && mcpSessionId && (
  <BuildProgress
    sessionId={mcpSessionId}
    onComplete={() => setBuildActive(false)}
  />
)}
```

- [ ] **Step 3: Remover el useEffect del bridge en page.js**

Eliminar el bloque que empieza con:
```javascript
const channelName = `session:${getSessionId()}`
const ch = supabase.channel(channelName, { config: { private: true } })
```

Y el handler que envía eventos con `token: getSessionToken()`.

> Nota: `supabase` del lib existente se mantiene para auth. Solo se remueven las partes de bridge.

- [ ] **Step 4: Agregar API key a SettingsPanel o como banner temporal**

En `web/app/components/SettingsPanel.js` (o el panel de ajustes existente), agregar una sección para ingresar la API key:

```javascript
import { getApiKey, setApiKey } from '../lib/mcp-client'

// Dentro del componente, agregar:
const [apiKey, setApiKeyState] = useState(getApiKey())
const saveApiKey = (val) => { setApiKey(val); setApiKeyState(val) }

// En el JSX:
<div>
  <label style={{ fontSize: 12, color: '#888' }}>CCC API Key</label>
  <input
    value={apiKey}
    onChange={e => saveApiKey(e.target.value)}
    placeholder="uk_..."
    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '8px 12px', fontSize: 13 }}
  />
  <div style={{ fontSize: 11, color: '#525252', marginTop: 4 }}>
    Genera tu key en app.ccc.app/settings
  </div>
</div>
```

- [ ] **Step 5: Agregar env var MCP_SERVER_URL a Netlify (PWA)**

```bash
cd web
netlify env:set NEXT_PUBLIC_MCP_SERVER_URL "https://cc-creator-mcp.netlify.app"
```

- [ ] **Step 6: Build y deploy de la PWA**

```bash
cd web
npm run build 2>&1 | tail -20
# Esperado: sin errores

netlify deploy --prod --dir=.next
```

- [ ] **Step 7: Prueba end-to-end manual**

1. Abrir la PWA en el browser
2. Iniciar sesión
3. Crear un proyecto con nodos en el canvas
4. Presionar "Construir" → completar el BriefingModal
5. Verificar que aparece `OnboardingMCP` con el comando `claude mcp add`
6. En terminal real: ejecutar el comando mostrado
7. En Claude Code Desktop: abrir una carpeta de proyecto vacía
8. Claude Code debería llamar `read_brief` automáticamente (verificar en la PWA que `BuildProgress` recibe el primer evento)

> El CLAUDE.md global del usuario debe incluir instrucciones para llamar `read_brief`. Agregar manualmente en `~/.claude/CLAUDE.md`:
```markdown
## CCC Integration
Si el MCP `cc-creator` está configurado, llama `read_brief` con el `session_id`
que encuentres en el CLAUDE.md del proyecto antes de hacer cualquier cosa.
```

- [ ] **Step 8: Commit local**

```bash
git add web/app/page.js web/app/components/BriefingModal.js web/app/components/SettingsPanel.js
git commit -m "feat(pwa): wire MCP client — reemplaza bridge con MCP server"
```

---

## Execution Handoff

Plan guardado. Dos opciones de ejecución:

**1. Subagent-Driven (recomendado)** — subagente fresco por task, review entre tasks

**2. Inline** — ejecutar en esta sesión con superpowers:executing-plans

¿Cuál prefieres?
