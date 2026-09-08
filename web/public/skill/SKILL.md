---
name: cc-brew
description: Evalúa si una idea vale la pena construirla antes de gastar tiempo y dinero. Decisión honesta: BUILD, RETHINK, o DON'T BUILD. Brief listo para Claude Code solo si la decisión es BUILD.
---

# CC Brew — Skill para Claude Code

Evalúa si tu idea vale la pena construirla. Sin rodeos, sin motivación falsa — una decisión honesta basada en 10 criterios. Si la respuesta es BUILD, te damos un brief listo para que Claude Code la construya.

**Gratis.** Usa tu suscripción de Claude Code. Sin créditos adicionales.

## Cuándo usar

Trigger: `/cc-brew` o cuando el usuario mencione que tiene una idea y no sabe si vale la pena construirla, o pregunte "¿debería construir esto?"

---

## Proceso

### Paso 1 — Idea libre

Pide al usuario que describa su idea sin estructura, como si se la contara a un amigo. Una sola pregunta:

> "Contame tu idea — qué es, para quién es, y por qué creés que tiene sentido."

Escuchá todo lo que digan. No interrumpas con preguntas adicionales.

**Si el usuario comparte imágenes** (mockups, capturas, referencias): describí en 1-2 frases por imagen qué aporta como referencia de diseño. Agregá esa descripción al final de la idea, bajo "Referencias visuales adjuntas:".

---

### Paso 2 — Cuestionario adaptativo

Generá **6-10 preguntas de opción múltiple** que cubran estas áreas:

1. **PROBLEMA** — ¿Qué problema resuelve? ¿Para quién? ¿Por qué importa?
2. **PÚBLICO** — ¿Quién es el usuario/cliente? ¿No es "todos"?
3. **DIFERENCIACIÓN** — ¿Por qué esta y no otra? ¿Qué la hace distinta?
4. **ALCANCE** — ¿Qué entra en v1? ¿Qué se deja para después?
5. **FACTIBILIDAD** — ¿Es técnicamente posible? ¿Sin bloqueos críticos?
6. **DISTRIBUCIÓN** — ¿Cómo llega al cliente? ¿Hay un canal?
7. **MONETIZACIÓN** — ¿Cómo se paga? ¿Hay modelo o hipótesis?

**Reglas:**
- Opciones como chips/botones (3-4 por pregunta)
- Incluí siempre una opción conservadora: "Solo el núcleo", "No estoy seguro"
- NO preguntes lo que ya está claro en la idea
- Idioma: español

---

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

---

### Paso 4 — Decisión

Basado en la evaluación, dá una de estas decisiones:

- **BUILD**: Señal suficiente para construir
- **RETHINK**: Hay potencial pero faltan señales críticas
- **DON'T BUILD**: Señales demasiado débiles

Explicá por qué en 2-3 frases directas, sin rodeos.

**Si la info es insuficiente**, podés decir "NOT_ENOUGH_SIGNAL" o "VALIDATE_FIRST" — no fuerces una decisión cuando no hay datos.

---

### Paso 5 — Brief (solo si BUILD)

Si la decisión es BUILD, generá un brief de construcción:

```markdown
# [Nombre] — Brief de Construcción

## Para quién es
[1-2 frases sobre el usuario/cliente]

## Qué resuelve
[El problema concreto]

## Criterio de éxito
[Cómo sabemos que funcionó]

## Alcance v1 — incluye
- [Feature 1]
- [Feature 2]

## Alcance v1 — excluye
- [Lo que se construye después]

## Stack recomendado
[Tech stack simple]

## Restricciones
- Plataforma: [web/móvil/desktop]
- Integraciones: [las necesarias]

## Primeros 3 pasos
1. [Acción concreta hoy]
2. [Construir la pieza mínima]
3. [Validar con alguien real]
```

---

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

---

### Paso 7 — Guardar resultado

Si la decisión es BUILD, escribí el brief como `CC-BREW-BRIEF.md` en el directorio actual:

```bash
# Claude Code escribe el archivo directamente
```

Si el MCP `cc-brew` está disponible, guardá la sesión con `save_evaluation` y el brief con `brief_md`.

---

## Instalación (para el usuario)

**Opción A — Skill solo** (sin MCP, flujo completo en Claude Code):
```bash
mkdir -p ~/.claude/skills/cc-brew
curl -o ~/.claude/skills/cc-brew/SKILL.md \
  https://ccbrew.kitifica.com/skill/SKILL.md
```

**Opción B — Skill + MCP** (guarda sesiones en la nube):
```bash
# 1. MCP
claude mcp add cc-brew --transport http "https://cc-brew-mcp.netlify.app/mcp" --scope user

# 2. Skill
mkdir -p ~/.claude/skills/cc-brew
curl -o ~/.claude/skills/cc-brew/SKILL.md \
  https://ccbrew.kitifica.com/skill/SKILL.md
```

**Activar en CLAUDE.md** (global o por proyecto):
```markdown
# cc-brew
- **cc-brew** (`~/.claude/skills/cc-brew/SKILL.md`) - evalúa si una idea vale la pena construirla
Trigger: `/cc-brew`
```

Luego usa `/cc-brew` desde cualquier directorio en Claude Code.
