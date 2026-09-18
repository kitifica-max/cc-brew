# CC Brew — Business Check + fuente única de verdad (sub-proyecto 1 de 3)

## Contexto

**Alcance confirmado por el usuario: este spec aplica solo al Skill de Claude Code + MCP — no a la web app.**

El repo tiene dos pipelines de evaluación de CC Brew que coexisten, con tablas de Supabase separadas:

- **Skill + MCP** (`docs/skills/cc-brew/SKILL.md` / `web/public/skill/SKILL.md` + `mcp/lib/tools.js`) — gratis, el razonamiento corre en la sesión de Claude Code del usuario (sin llamar a ninguna API de Kitifica). El MCP (`create_session`, `save_idea`, `save_questionnaire`, `save_evaluation`, `track_event`) es persistencia pura sobre `cc_brew_sessions`/`cc_brew_events` — no genera contenido con IA. **Esta es la superficie que este spec toca.**
- **Web app / PWA** (`ai-process.mjs` + `ai-shared.js` + `BuildDecision.js`, tabla `ccc_projects`, créditos/planes/`BuyMinutes`) — confirmé en código que sigue activa (gating de créditos, migraciones de hace semanas, landing propia). El usuario indica que conceptualmente ya no es "CC Brew" — **queda fuera de este spec por instrucción explícita**, sin resolver por qué el código sigue ahí. No se toca nada en `web/app/` ni en `mcp/lib/ai-shared.js` / `mcp/netlify/functions/ai-process*.mjs`.

**Hallazgo — código muerto, tampoco se toca acá:** `web/app/components/SemaforoView.js` no está importado en `web/app/page.js`, referencia un `SEMAFORO_PROMPT` inexistente. Resto de un pivote anterior. Fuera de alcance.

## Objetivo de este sub-proyecto

Evolucionar la personalidad y los criterios de evaluación del Skill de CC Brew de "filtro de ideas" (10 criterios de producto) a "Co-Fundador Técnico y de Negocios" (14 criterios: los 10 existentes + 4 de Business Check), con un formato de veredicto más accionable — desde una sola fuente de verdad, en vez de mantener las dos copias de SKILL.md sincronizadas a mano (ya estaban desincronizadas en otras secciones antes de este cambio).

**Fuera de alcance** (sub-proyectos separados, o directamente no incluidos):
- Todo lo de la web app / PWA (`ai-shared.js`, `ai-process.mjs`, `BuildDecision.js`, `ccc_projects`).
- Paso interactivo "Roast del Cliente Cínico" (depende de este spec, ciclo propio).
- Landing page animada.
- Limpieza de `SemaforoView.js`.

## Arquitectura: fuente canónica + generador

> **Nota post-implementación:** lo que sigue describe el diseño aprobado. Lo que terminó saliendo difiere en un punto — el export se llama `BUSINESS_CHECK_SECTIONS` (no `BUSINESS_CHECK_FRAMEWORK`) y son 4 secciones con 4 pares de marcadores independientes (no 1), porque personalidad/criterios/formato de salida/persistencia viven en 4 puntos no contiguos del documento. La sección de persistencia (instrucciones para llamar `save_evaluation` con los campos nuevos) se agregó en una ronda de revisión final — el spec original no la anticipaba explícitamente, fue un hallazgo real de que sin ella los campos nuevos de `save_evaluation` quedaban aceptados pero nunca usados.

SKILL.md es markdown estático que Claude Code lee en una sesión conversacional — no puede hacer `import` de JS en tiempo de lectura. La única forma de tener una fuente real (no dos copias sincronizadas a mano) es: un archivo canónico + un paso de generación que materializa la copia de cada SKILL.md.

- **`mcp/lib/prompts/business-check.js`** — exporta `BUSINESS_CHECK_SECTIONS` (objeto con 4 strings: `personality`, `criteria`, `outputFormat`, `persistence`). Contiene, en prosa lista para insertar directo en SKILL.md, en español:
  1. Personalidad/objetivo (implacable, técnico, visión de negocio, no cheerleader).
  2. Los 14 criterios (ver abajo), cada uno con su pregunta guía.
  3. Instrucciones del formato de salida (ver abajo).
  4. Instrucciones de persistencia — llamar `save_evaluation` con los 3 campos nuevos, incluyendo el mapeo exacto Técnico/Mercado/Clonación → tecnico/mercado/clonacion.
  - `.js` con strings exportados, no un `.md` — no hay riesgo de bundling de Netlify Functions acá (nada de esto corre en una function), pero mantiene el mismo patrón que ya usa `mcp/lib/` para todo lo demás.

- **`mcp/scripts/sync-skill.mjs`** — lee `BUSINESS_CHECK_SECTIONS`, reemplaza el contenido entre 4 pares de marcadores independientes (`<!-- BUSINESS-CHECK:PERSONALITY/CRITERIA/OUTPUT/PERSISTENCE:START/END -->`, uno por sección, en su posición natural dentro del documento) en:
  - `docs/skills/cc-brew/SKILL.md`
  - `web/public/skill/SKILL.md` (esta es la que de verdad instalan los usuarios vía `curl`)
  - El resto de cada archivo (instalación, numeración de pasos) no se toca.
  - Se agrega `"sync-skill": "node scripts/sync-skill.mjs"` a `mcp/package.json`, y `deploy` pasa a `"npm run sync-skill && netlify deploy --prod --build --site ..."` — imposible deployar con las copias desincronizadas.

## Los 14 criterios

Los 10 existentes (`problem_clarity`, `target_audience`, `value_proposition`, `competition`, `feasibility`, `monetization`, `mvp_scope`, `distribution`, `timing`, `founder_fit`) no cambian — mismo orden, mismas preguntas, misma escala (`strong`/`moderate`/`weak`/`unknown` + `reason`).

Se agregan 4 nuevos, como grupo separado "Business Check" al final:

| key | label | pregunta guía |
|---|---|---|
| `moat` | Foso defensivo (Moat) | ¿Es un wrapper de IA que alguien clona en una tarde, o tiene integraciones físicas (ej. control de acceso), redes B2B, datos propios o arquitectura local que lo hacen difícil de copiar? |
| `gtm` | Go-to-market | ¿El usuario tiene acceso real a la audiencia objetivo? (ej. si es para restaurantes, ¿conoce dueños de restaurantes?) |
| `unit_economics` | Unit economics | Si depende de APIs externas (LLMs, Stripe, etc.), ¿el costo por transacción/consumo destruye el margen de un SaaS estándar? |
| `usage_frequency` | Frecuencia de uso | ¿Es un dolor agudo de uso diario (painkiller) o esporádico (vitamina)? Define si debería ser suscripción o pago único. |

Misma escala de señal. La decisión final sigue siendo un juicio holístico de Claude Code sobre los 14 — no se introduce una fórmula de puntaje.

## Formato de salida que el Skill le pide a Claude Code (Paso 6 de SKILL.md)

Se mantienen `decision`, `why`/explicación, `strongest_signal`, `biggest_risk`, `what_would_change`, `criteria` (ahora 14), `before_you_build`/`v1_scope`/`dont_build_yet` — mismo espíritu que hoy. Se agregan, sin reemplazar nada:

- **`biggest_risk_category`**: `tecnico | mercado | clonacion` — clasifica `biggest_risk` (tag adicional, no lo reemplaza).
- **`resource_estimate`**: `{ hours_low, hours_high, infra_notes }` — rango de horas (no un número único, más honesto), más notas de costo de infra inicial.
- **`stack_recommendation`**: `{ approach, reasoning }` — texto libre guiado, no un enum fijo. Si el producto requiere privacidad → local-first (SQLite + sync). Si requiere velocidad/simplicidad → el stack más directo para que Claude Code lo construya sin fricción. Sin stacks genéricos sin razón.

El "Brief de Construcción" (Paso 5, solo si BUILD) ya tiene alcance v1 incluye/excluye y stack recomendado — se refuerza el texto para que sea explícito sobre arquitectura exacta y features excluidas por ahora, sin cambiar su estructura.

## MCP — `mcp/lib/tools.js`

Hoy `save_evaluation` documenta y guarda `{ criteria, strongest_signal, biggest_risk, what_would_change, brief_md }` en `cc_brew_sessions.evaluation`. Si el Skill empieza a generar `biggest_risk_category`/`resource_estimate`/`stack_recommendation` pero la tool no los acepta, **se pierden en silencio** (quedan fuera de los parámetros desestructurados, ni error ni guardado).

Cambios:
- `TOOL_DEFINITIONS` → `save_evaluation.inputSchema.properties`: agregar `biggest_risk_category`, `resource_estimate`, `stack_recommendation`. Descripción de `criteria` pasa de "10 criterios" a "14 criterios (10 de producto + 4 de Business Check)".
- `save_evaluation()`: desestructurar los 3 campos nuevos, incluirlos en el objeto `evaluation` que se escribe en Supabase.
- **Verificar en implementación** si `cc_brew_sessions.evaluation` es `jsonb` (todo el patrón del codebase sugiere que sí, igual que `ccc_projects.decision`, pero no leí el DDL de esta tabla específica) — si lo es, no hace falta migración, igual que con la otra tabla.

## Verificación

- `business-check.js`: self-check (`node mcp/lib/prompts/business-check.js`) — el string no está vacío, contiene las 14 keys.
- `sync-skill.mjs`: self-check post-ejecución — ambos SKILL.md idénticos entre marcadores tras correrlo.
- `node --check` en todos los `.js` tocados.
- **Puedo verificar esto yo mismo de punta a punta, sin depender de una cuenta con balance real**: llamar `save_evaluation` contra el MCP deployado (`cc-brew-mcp.netlify.app/mcp`, JSON-RPC, sin auth) con los 3 campos nuevos, confirmar que persisten. Mismo patrón que usé para probar `validate_demand` antes en esta sesión.
- Manual (del usuario): correr `/cc-brew` en una sesión de Claude Code con una idea de prueba, confirmar los 14 criterios y el nuevo formato de salida.

## Rollout

Sin flags. Cambio aditivo en el contrato de `save_evaluation`. Deploy vía `npm run deploy` en `mcp/` (que ahora corre `sync-skill` antes).
