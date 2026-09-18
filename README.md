<p align="center">
  <img src="logos/ccbrew_fav.svg" alt="CC Brew" width="160"/>
</p>

# CC Brew — Antes de construir, preguntate si vale la pena

Con IA construir es barato. Pero construir la cosa equivocada sale caro. CC Brew desafía tu idea antes de que Claude Code pierda tiempo en ella.

**BUILD / RETHINK / DON'T BUILD** — una decisión honesta basada en 10 criterios. Si la respuesta es BUILD, te damos un brief listo para que Claude Code la construya.

```
/cc-brew en Claude Code
  Idea libre
  Cuestionario adaptativo (6-10 preguntas)
  Evaluación con 10 criterios
  Decisión: BUILD · RETHINK · DON'T BUILD
  Brief (solo si BUILD)
```

**Gratis con tu suscripción de Claude Code · Sin créditos adicionales**

---

## Cómo funciona

1. **Contale tu idea** — sin estructura. Qué es, para quién es, y qué problema creés que resuelve.
2. **Te cuestionamos** — preguntas diseñadas para encontrar lo que no cierra. No te ayudamos a desarrollar la idea — la cuestionamos.
3. **Recibí tu decisión** — **BUILD**, **RETHINK** o **DON'T BUILD** con las razones, el mayor riesgo y qué hacer antes de abrir Claude Code.

---

## 10 criterios de evaluación

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

---

## La decisión

### BUILD
Señal suficiente para construir. Se genera un brief con el problema, el usuario, el alcance de v1 y el stack recomendado.

### RETHINK
Hay potencial pero faltan señales críticas. CC Brew te dice exactamente qué falta.

### DON'T BUILD
Señales demasiado débiles. No significa que el producto falló — significa que te ahorraste días de construir algo que no debería existir.

---

## Instalación

### Skill (recomendado)

```bash
mkdir -p ~/.claude/skills/cc-brew
curl -o ~/.claude/skills/cc-brew/SKILL.md \
  https://ccbrew.kitifica.com/skill/SKILL.md
```

Agregá esta entrada en `~/.claude/CLAUDE.md`:

```markdown
# cc-brew
- **cc-brew** (`~/.claude/skills/cc-brew/SKILL.md`) - evalúa ideas antes de construirlas
  Trigger: `/cc-brew`
```

### Skill + MCP (guarda sesiones en la nube)

```bash
# 1. MCP
claude mcp add cc-brew --transport http "https://cc-brew-mcp.netlify.app/mcp" --scope user

# 2. Skill
mkdir -p ~/.claude/skills/cc-brew
curl -o ~/.claude/skills/cc-brew/SKILL.md \
  https://ccbrew.kitifica.com/skill/SKILL.md
```

---

## Arquitectura

```
cc-brew/
├── web/public/landing/    # Landing page (HTML estático)
├── web/public/skill/      # SKILL.md para descarga
├── mcp/                   # MCP server (Netlify Functions)
│   ├── lib/tools.js       # Herramientas MCP
│   └── netlify/functions/ # Functions serverless
├── supabase/              # Migraciones y esquema
└── docs/skills/cc-brew/   # SKILL.md fuente
```

| Componente | Tecnología | Rol |
|---|---|---|
| Skill | Markdown | Flujo completo de evaluación en Claude Code |
| MCP Server | Netlify Functions | Persistencia de sesiones en la nube |
| Backend | Supabase | Auth, datos, storage |
| Landing | HTML estático | ccbrew.kitifica.com |

---

## Desarrollo local

```bash
# Landing
cd web && npx serve public/landing

# MCP Server
cd mcp && npm install && npm run dev
```

---

## Repo

[github.com/kitifica-max/cc-brew](https://github.com/kitifica-max/cc-brew)

---

## Licencia

[MIT](LICENSE)
