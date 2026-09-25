# CC Brew Business Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve CC Brew's Skill+MCP evaluation from 10 product-only criteria to 14 (10 existing + a "Business Check" group: moat/gtm/unit_economics/usage_frequency), with a richer verdict output (risk category, resource estimate, stack recommendation) — from a single canonical source instead of two hand-synced SKILL.md copies.

**Architecture:** One canonical content module (`mcp/lib/prompts/business-check.js`) exports three named prose sections. A generator script (`mcp/scripts/sync-skill.mjs`) writes those sections into marker-delimited regions of both SKILL.md copies. `mcp/lib/tools.js`'s `save_evaluation` MCP tool is extended to accept and persist the 3 new verdict fields it would otherwise silently drop.

**Tech Stack:** Node.js (ESM), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-cc-brew-business-check-design.md`

## Global Constraints

- Scope is Skill + MCP only. Do not touch `web/app/**`, `mcp/lib/ai-shared.js`, or `mcp/netlify/functions/ai-process*.mjs` — explicitly out of scope per the spec.
- Do not touch `web/app/components/SemaforoView.js` — confirmed dead code, out of scope.
- No new npm dependencies.
- Existing 10 criteria keep their exact keys, order, and questions — do not reword them.
- The 4 new criteria use the exact keys `moat`, `gtm`, `unit_economics`, `usage_frequency`.
- Signal scale for all 14 criteria stays `strong` | `moderate` | `weak` | `unknown`.
- No scoring formula — the decision stays a holistic judgment, not a computed score.
- `docs/skills/cc-brew/SKILL.md` and `web/public/skill/SKILL.md` must be byte-identical inside every marker pair after generation.
- Do not run `npm run deploy` (a real production deploy) as part of any task — that stays a manual, user-triggered step after all tasks land.

---

### Task 1: Canonical Business Check content module

**Files:**
- Create: `mcp/lib/prompts/business-check.js`

**Interfaces:**
- Produces: `export const BUSINESS_CHECK_SECTIONS` — a plain object `{ personality: string, criteria: string, outputFormat: string }`. Task 2 imports this object and its three keys by name.

- [ ] **Step 1: Write `mcp/lib/prompts/business-check.js`**

```js
import { pathToFileURL } from 'node:url'

// Fuente única de los criterios de evaluación y el formato de veredicto de
// CC Brew. mcp/scripts/sync-skill.mjs vuelca este contenido en ambas copias
// de SKILL.md — no editar SKILL.md directo para estos 3 bloques, se pisa en
// el próximo sync.
export const BUSINESS_CHECK_SECTIONS = {
  personality: [
    "Sos CC Brew: un evaluador implacable, técnico y con visión de negocio — no un cheerleader. Tu trabajo es evitar que el usuario pierda tiempo y dinero construyendo algo sin mercado real o trivialmente clonable. Antes de dar un veredicto (BUILD, RETHINK, DON'T BUILD), sometés la idea a un Business Check riguroso — no alcanza con que el producto tenga sentido, el negocio detrás también tiene que tenerlo. Sin rodeos, sin motivación falsa, basado en 14 criterios. Si la respuesta es BUILD, te damos un brief listo para que Claude Code la construya.",
  ].join('\n'),

  criteria: [
    '### Paso 3 — Evaluar con 14 criterios (Business Check)',
    '',
    'Con la idea + las respuestas, evaluá estos 14 criterios. Para cada uno, asigná una señal:',
    '',
    '| Criterio | ¿Qué mide? |',
    '|---|---|',
    '| `problem_clarity` | ¿El problema está claramente definido? |',
    '| `target_audience` | ¿El público está definido con precisión? |',
    '| `value_proposition` | ¿La propuesta es clara y diferenciada? |',
    '| `competition` | ¿Se conoce la competencia? ¿Hay diferenciación? |',
    '| `feasibility` | ¿Es técnicamente factible? |',
    '| `monetization` | ¿Hay modelo de monetación o hipótesis? |',
    '| `mvp_scope` | ¿El MVP es acotado y realista? |',
    '| `distribution` | ¿Cómo llega al cliente? |',
    '| `timing` | ¿Por qué ahora? |',
    '| `founder_fit` | ¿El fundador tiene el contexto/capacidades? |',
    '',
    '**Business Check — los 4 que separan un producto de un negocio:**',
    '',
    '| Criterio | ¿Qué mide? |',
    '|---|---|',
    '| `moat` | ¿Es un wrapper de IA que alguien clona en una tarde, o tiene integraciones físicas (ej. control de acceso), redes B2B, datos propios o arquitectura local que lo hacen difícil de copiar? |',
    '| `gtm` | ¿El usuario tiene acceso real a la audiencia objetivo? (si es para restaurantes, ¿conoce dueños de restaurantes?) |',
    '| `unit_economics` | Si depende de APIs externas (LLMs, Stripe, etc.), ¿el costo por transacción destruye el margen de un SaaS estándar? |',
    '| `usage_frequency` | ¿Es un dolor agudo de uso diario (painkiller) o esporádico (vitamina)? Define si debería ser suscripción o pago único. |',
    '',
    '**Señales:** `strong` | `moderate` | `weak` | `unknown`',
    '',
    '**Red Team Analysis:**',
    '- `strongest_signal`: La señal más positiva',
    '- `biggest_risk`: El riesgo más grande',
    '- `what_would_change`: Qué información cambiaría la decisión',
  ].join('\n'),

  outputFormat: [
    '### Paso 6 — Mostrar resultado',
    '',
    'Presentá la decisión al usuario con esta estructura estricta:',
    '',
    '```',
    '📊 EVALUACIÓN CC BREW',
    '',
    "[DECISIÓN]: [BUILD / RETHINK / DON'T BUILD]",
    '',
    'Por qué: [explicación directa]',
    '',
    'EL MAYOR RIESGO: [Técnico / Mercado / Clonación] — [detalle de biggest_risk]',
    '',
    'ESTIMADOR DE RECURSOS (V1): [rango de horas de desarrollo crudo con IA] · [costos de infraestructura inicial]',
    '',
    'RECOMENDACIÓN DE STACK: [nunca genérico — Local-First (SQLite + Sync) si requiere privacidad; el stack más directo para que Claude Code lo construya sin fricción si requiere velocidad]',
    '',
    '[Si BUILD: "El brief de construcción está listo — arquitectura exacta, alcance estricto de V1, features excluidas por ahora. ¿Arrancamos?"]',
    '[Si RETHINK: "¿Tenés más info que pueda cambiar la evaluación?"]',
    "[Si DON'T BUILD: \"¿Querés evaluar otra idea?\"]",
    '```',
  ].join('\n'),
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg) }
  const { personality, criteria, outputFormat } = BUSINESS_CHECK_SECTIONS

  assert(personality.length > 0, 'personality no vacío')
  assert(criteria.length > 0, 'criteria no vacío')
  assert(outputFormat.length > 0, 'outputFormat no vacío')

  const keys = ['problem_clarity', 'target_audience', 'value_proposition', 'competition',
    'feasibility', 'monetization', 'mvp_scope', 'distribution', 'timing', 'founder_fit',
    'moat', 'gtm', 'unit_economics', 'usage_frequency']
  for (const k of keys) assert(criteria.includes('`' + k + '`'), `criteria incluye ${k}`)

  for (const phrase of ['EL MAYOR RIESGO', 'ESTIMADOR DE RECURSOS', 'RECOMENDACIÓN DE STACK']) {
    assert(outputFormat.includes(phrase), `outputFormat incluye "${phrase}"`)
  }

  console.log('business-check.js: OK (14 criterios, 3 campos de formato de salida)')
}
```

- [ ] **Step 2: Run the self-check**

Run: `node "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp/lib/prompts/business-check.js"`
Expected: `business-check.js: OK (14 criterios, 3 campos de formato de salida)`

- [ ] **Step 3: Syntax check**

Run: `node --check "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp/lib/prompts/business-check.js"`
Expected: no output, exit code 0

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72" && git add mcp/lib/prompts/business-check.js && git commit -m "feat(cc-brew): canonical Business Check content module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Generator + marker-wrapped SKILL.md sections

**Files:**
- Create: `mcp/scripts/sync-skill.mjs`
- Modify: `docs/skills/cc-brew/SKILL.md`
- Modify: `web/public/skill/SKILL.md`

**Interfaces:**
- Consumes: `BUSINESS_CHECK_SECTIONS` from `mcp/lib/prompts/business-check.js` (Task 1) — keys `personality`, `criteria`, `outputFormat`.
- Produces: `node mcp/scripts/sync-skill.mjs` — no exports, a runnable script. Task 4 references its path in `package.json`.

- [ ] **Step 1: Insert empty markers in `docs/skills/cc-brew/SKILL.md`, replacing the 3 hand-written sections**

Replace the personality paragraph:

old:
```
Evalúa si tu idea vale la pena construirla. Sin rodeos, sin motivación falsa — una decisión honesta basada en 10 criterios. Si la respuesta es BUILD, te damos un brief listo para que Claude Code la construya.
```

new:
```
<!-- BUSINESS-CHECK:PERSONALITY:START -->
<!-- BUSINESS-CHECK:PERSONALITY:END -->
```

Replace Paso 3 in full (header through the Red Team Analysis bullets):

old:
```
### Paso 3 — Evaluar con 10 criterios

Con la idea + las respuestas, evaluá estos 10 criterios. Para cada uno, asigná una señal:

| Criterio | ¿Qué mide? |
|---|---|
| `problem_clarity` | ¿El problema está claramente definido? |
| `target_audience` | ¿El público está definido con precisión? |
| `value_proposition` | ¿La propuesta es clara y diferenciada? |
| `competition` | ¿Se conoce la competencia? ¿Hay diferenciación? |
| `feasibility` | ¿Es técnicamente factible? |
| `monetization` | ¿Hay modelo de monetación o hipótesis? |
| `mvp_scope` | ¿El MVP es acotado y realista? |
| `distribution` | ¿Cómo llega al cliente? |
| `timing` | ¿Por qué ahora? |
| `founder_fit` | ¿El fundador tiene el contexto/capacidades? |

**Señales:** `strong` | `moderate` | `weak` | `unknown`

**Red Team Analysis:**
- `strongest_signal`: La señal más positiva
- `biggest_risk`: El riesgo más grande
- `what_would_change`: Qué información cambiaría la decisión
```

new:
```
<!-- BUSINESS-CHECK:CRITERIA:START -->
<!-- BUSINESS-CHECK:CRITERIA:END -->
```

Replace Paso 6 in full:

old:
```
### Paso 6 — Mostrar resultado

Presentá la decisión al usuario:

```
📊 EVALUACIÓN CC BREW

DECISIÓN: [BUILD / RETHINK / DON'T BUILD]

Por qué: [explicación directa]

Señal más fuerte: [lo positivo]
Riesgo más grande: [lo preocupante]
Qué cambiaría: [info faltante]

[Si BUILD: "Tu brief está listo. ¿Arrancamos con los primeros 3 pasos?"]
[Si RETHINK: "¿Tenés más info que pueda cambiar la evaluación?"]
[Si DON'T BUILD: "¿Querés evaluar otra idea?"]
```
```

new:
```
<!-- BUSINESS-CHECK:OUTPUT:START -->
<!-- BUSINESS-CHECK:OUTPUT:END -->
```

- [ ] **Step 2: Apply the same 3 replacements to `web/public/skill/SKILL.md`**

Identical old/new pairs as Step 1 (this section of the file is currently byte-identical between the two copies — confirmed by diff earlier in the session).

- [ ] **Step 3: Write `mcp/scripts/sync-skill.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'path'
import { BUSINESS_CHECK_SECTIONS } from '../lib/prompts/business-check.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const SKILL_FILES = [
  join(__dir, '../../docs/skills/cc-brew/SKILL.md'),
  join(__dir, '../../web/public/skill/SKILL.md'),
]

const MARKER_KEYS = { personality: 'PERSONALITY', criteria: 'CRITERIA', outputFormat: 'OUTPUT' }

function replaceBetweenMarkers(content, markerName, replacement) {
  const start = `<!-- BUSINESS-CHECK:${markerName}:START -->`
  const end = `<!-- BUSINESS-CHECK:${markerName}:END -->`
  const startIdx = content.indexOf(start)
  const endIdx = content.indexOf(end)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Marcador ${markerName} no encontrado — corré primero la inserción de marcadores vacíos`)
  }
  const before = content.slice(0, startIdx + start.length)
  const after = content.slice(endIdx)
  return `${before}\n${replacement}\n${after}`
}

for (const filePath of SKILL_FILES) {
  let content = readFileSync(filePath, 'utf8')
  for (const [sectionKey, markerName] of Object.entries(MARKER_KEYS)) {
    content = replaceBetweenMarkers(content, markerName, BUSINESS_CHECK_SECTIONS[sectionKey])
  }
  writeFileSync(filePath, content, 'utf8')
  console.log(`sync-skill: actualizado ${filePath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [fileA, fileB] = SKILL_FILES.map(f => readFileSync(f, 'utf8'))
  for (const markerName of Object.values(MARKER_KEYS)) {
    const extract = (content) => {
      const start = `<!-- BUSINESS-CHECK:${markerName}:START -->`
      const end = `<!-- BUSINESS-CHECK:${markerName}:END -->`
      return content.slice(content.indexOf(start), content.indexOf(end) + end.length)
    }
    if (extract(fileA) !== extract(fileB)) {
      throw new Error(`FAIL: la sección ${markerName} difiere entre los dos SKILL.md tras el sync`)
    }
  }
  if (fileA.includes('Evaluar con 10 criterios') || fileB.includes('Evaluar con 10 criterios')) {
    throw new Error('FAIL: todavía queda texto viejo de "10 criterios" sin reemplazar')
  }
  console.log('sync-skill.mjs: OK (ambos SKILL.md idénticos entre marcadores, sin texto viejo)')
}
```

- [ ] **Step 4: Run the generator**

Run: `cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp" && node scripts/sync-skill.mjs`
Expected:
```
sync-skill: actualizado .../docs/skills/cc-brew/SKILL.md
sync-skill: actualizado .../web/public/skill/SKILL.md
```

- [ ] **Step 5: Run the self-check**

Run: `cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp" && node scripts/sync-skill.mjs` (running it again — the self-check block executes every run)
Expected: last line `sync-skill.mjs: OK (ambos SKILL.md idénticos entre marcadores, sin texto viejo)`

- [ ] **Step 6: Syntax check + visual confirmation**

Run: `node --check "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp/scripts/sync-skill.mjs"`
Expected: exit code 0

Then read both `docs/skills/cc-brew/SKILL.md` and `web/public/skill/SKILL.md` and confirm: Paso 3 now says "14 criterios" with the Business Check table, Paso 6 shows the new `[DECISIÓN]`/`EL MAYOR RIESGO`/`ESTIMADOR DE RECURSOS`/`RECOMENDACIÓN DE STACK` structure, and Paso 1/2/2.5/4/5/7/Instalación are untouched.

- [ ] **Step 7: Commit**

```bash
cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72" && git add mcp/scripts/sync-skill.mjs docs/skills/cc-brew/SKILL.md web/public/skill/SKILL.md && git commit -m "feat(cc-brew): generate SKILL.md Business Check sections from canonical source

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Extend `save_evaluation` MCP tool for the 3 new verdict fields

**Files:**
- Modify: `mcp/lib/tools.js`

**Interfaces:**
- Consumes: field names `biggest_risk_category` (string), `resource_estimate` (object), `stack_recommendation` (object) — contract fixed by the spec, no code dependency on Tasks 1/2.
- Produces: `save_evaluation` tool now persists these 3 fields inside `cc_brew_sessions.evaluation`. No other task consumes this directly.

- [ ] **Step 1: Extend the `save_evaluation` tool definition**

old:
```js
  {
    name: 'save_evaluation',
    description: 'Guarda la evaluación (10 criterios + decisión BUILD/RETHINK/DON\'T BUILD) y el brief generado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        decision: { type: 'string', enum: ['BUILD', 'RETHINK', 'DON\'T BUILD', 'NOT_ENOUGH_SIGNAL', 'VALIDATE_FIRST'] },
        criteria: {
          type: 'object',
          description: 'Objeto con señal (strong|moderate|weak|unknown) para cada uno de los 10 criterios',
        },
        strongest_signal: { type: 'string' },
        biggest_risk: { type: 'string' },
        what_would_change: { type: 'string' },
        brief_md: { type: 'string', description: 'Brief de construcción en markdown. Solo si decision es BUILD.' },
      },
      required: ['session_id', 'decision', 'criteria'],
    },
  },
```

new:
```js
  {
    name: 'save_evaluation',
    description: 'Guarda la evaluación (14 criterios: 10 de producto + 4 de Business Check + decisión BUILD/RETHINK/DON\'T BUILD) y el brief generado.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        decision: { type: 'string', enum: ['BUILD', 'RETHINK', 'DON\'T BUILD', 'NOT_ENOUGH_SIGNAL', 'VALIDATE_FIRST'] },
        criteria: {
          type: 'object',
          description: 'Objeto con señal (strong|moderate|weak|unknown) para cada uno de los 14 criterios (10 de producto + moat, gtm, unit_economics, usage_frequency)',
        },
        strongest_signal: { type: 'string' },
        biggest_risk: { type: 'string' },
        biggest_risk_category: { type: 'string', enum: ['tecnico', 'mercado', 'clonacion'], description: 'Clasificación de biggest_risk' },
        what_would_change: { type: 'string' },
        resource_estimate: {
          type: 'object',
          description: '{ hours_low, hours_high, infra_notes } — estimado de horas de desarrollo V1 y notas de costo de infraestructura inicial',
        },
        stack_recommendation: {
          type: 'object',
          description: '{ approach, reasoning } — recomendación de stack no genérica',
        },
        brief_md: { type: 'string', description: 'Brief de construcción en markdown. Solo si decision es BUILD.' },
      },
      required: ['session_id', 'decision', 'criteria'],
    },
  },
```

- [ ] **Step 2: Extend the `save_evaluation` implementation**

old:
```js
async function save_evaluation({ session_id, decision, criteria, strongest_signal, biggest_risk, what_would_change, brief_md }) {
  const { error } = await supabase
    .from('cc_brew_sessions')
    .update({
      status: 'evaluated',
      decision,
      evaluation: { criteria, strongest_signal, biggest_risk, what_would_change },
      brief_md: brief_md ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session_id)
  if (error) throw new Error(error.message)

  // log analytics
  await supabase.from('cc_brew_events').insert({ event: 'evaluation_complete', metadata: { decision } })

  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, decision }) }] }
}
```

new:
```js
async function save_evaluation({
  session_id, decision, criteria, strongest_signal, biggest_risk, biggest_risk_category,
  what_would_change, resource_estimate, stack_recommendation, brief_md,
}) {
  const { error } = await supabase
    .from('cc_brew_sessions')
    .update({
      status: 'evaluated',
      decision,
      evaluation: {
        criteria, strongest_signal, biggest_risk, biggest_risk_category,
        what_would_change, resource_estimate, stack_recommendation,
      },
      brief_md: brief_md ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', session_id)
  if (error) throw new Error(error.message)

  // log analytics
  await supabase.from('cc_brew_events').insert({ event: 'evaluation_complete', metadata: { decision } })

  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, decision }) }] }
}
```

- [ ] **Step 3: Syntax check**

Run: `node --check "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp/lib/tools.js"`
Expected: exit code 0

Note: `mcp/lib/tools.js` imports `mcp/lib/db.js`, which throws at import time without real `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` — this worktree doesn't have those, so `node lib/tools.js` (actually running it) isn't possible locally. `node --check` (parse-only, doesn't execute imports) is the full extent of local verification for this file. Functional verification happens post-deploy — see "Post-deploy verification" below.

- [ ] **Step 4: Commit**

```bash
cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72" && git add mcp/lib/tools.js && git commit -m "feat(cc-brew): save_evaluation accepts Business Check verdict fields

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire the generator into the deploy script

**Files:**
- Modify: `mcp/package.json`

**Interfaces:**
- Consumes: `mcp/scripts/sync-skill.mjs` existing at that path (Task 2).
- Produces: `npm run sync-skill` and an updated `npm run deploy` that runs it first. Nothing downstream depends on this task.

- [ ] **Step 1: Add the `sync-skill` script and make `deploy` run it first**

old:
```json
  "scripts": {
    "test": "node evals/run.mjs",
    "deploy": "netlify deploy --prod --build --site 32ab4992-9183-4b1b-a48b-b25393830b64"
  },
```

new:
```json
  "scripts": {
    "test": "node evals/run.mjs",
    "sync-skill": "node scripts/sync-skill.mjs",
    "deploy": "npm run sync-skill && netlify deploy --prod --build --site 32ab4992-9183-4b1b-a48b-b25393830b64"
  },
```

- [ ] **Step 2: Verify `npm run sync-skill` works from `mcp/`**

Run: `cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72/mcp" && npm run sync-skill`
Expected: same output as Task 2 Step 5 (both files reported updated, no errors) — running it again is a no-op on content (idempotent, markers already contain the right text) but must not error.

- [ ] **Step 3: Commit**

```bash
cd "/Users/daniel_elaniin/Documents/DP/CC Controller/.claude/worktrees/xenodochial-turing-7a2a72" && git add mcp/package.json && git commit -m "chore(cc-brew): run sync-skill before every mcp deploy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Post-deploy verification (manual, after the user runs `npm run deploy` themselves)

Not a task — `npm run deploy` is a real production deploy and stays user-triggered, per Global Constraints. Once deployed:

1. Confirm `tools/list` on the live MCP still lists `save_evaluation` with the extended schema:
   ```bash
   curl -s -X POST https://cc-brew-mcp.netlify.app/mcp -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
2. Round-trip `create_session` → `save_evaluation` with the 3 new fields against the live endpoint, then read it back (there's no `get_evaluation` tool — reading back means checking Supabase directly, or trusting a 200 response from `save_evaluation` since it already errors loudly on any Supabase failure).
3. Run `/cc-brew` in a real Claude Code session with a throwaway idea, confirm Paso 3 shows 14 criteria and Paso 6's output matches the new format.

## Self-Review

**Spec coverage:** canonical source (Task 1) ✓, generator + both SKILL.md (Task 2) ✓, `save_evaluation` schema (Task 3) ✓, deploy wiring (Task 4) ✓, web/PWA/SemaforoView explicitly untouched (Global Constraints) ✓, no scoring formula (Global Constraints) ✓.

**Placeholder scan:** no TBD/TODO; every step has real code; no "similar to Task N" shortcuts.

**Type/name consistency:** `BUSINESS_CHECK_SECTIONS.{personality,criteria,outputFormat}` (Task 1) match the keys `sync-skill.mjs` reads (Task 2) and the `MARKER_KEYS` mapping to `PERSONALITY`/`CRITERIA`/`OUTPUT` markers (also Task 2) match the markers inserted into both SKILL.md files (Task 2, Step 1-2). `biggest_risk_category`/`resource_estimate`/`stack_recommendation` names match exactly between the spec, Task 3's schema, and Task 3's destructured params.
