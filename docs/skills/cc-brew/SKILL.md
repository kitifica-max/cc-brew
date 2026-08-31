---
name: cc-brew
description: Convierte cualquier idea en una herramienta o pieza web a la medida de tu marca que convence a un cliente específico — perfil del cliente, lineamientos de marca, un cuestionario dirigido a su objeción real, y el CLAUDE.md listo para que Claude Code la construya. Gratis con tu suscripción.
---

# CC Brew — Skill para Claude Code

Convierte tu idea en una herramienta o pieza web que convence a un cliente específico — no una plantilla genérica de un editor cerrado, algo hecho a la medida de tu marca y de la objeción real que necesitás resolver. CC Brew te guía con preguntas clave, evalúa si la pieza está lista contra 6 criterios, y genera un `CLAUDE.md` listo para que Claude Code la construya con libertad total de stack.

**Gratis.** Usa tu suscripción de Claude Code. Sin créditos adicionales.

## Cuándo usar

Trigger: `/cc-brew` o cuando el usuario mencione que quiere construir una herramienta, calculadora, demo, landing, cotizador o cualquier pieza web para convencer a un cliente o prospecto puntual.

---

## Proceso

### Paso 1 — Idea libre

Pide al usuario que describa su idea sin estructura, como si se la contara a un amigo. Una sola pregunta:

> "Contame qué herramienta querés construir y a quién buscás convencer con ella."

Escuchá todo lo que digan. No interrumpas con preguntas adicionales todavía.

**Si el usuario comparte imágenes** (mockups, capturas de su sitio, campañas anteriores, materiales de venta) junto con la idea: ya podés verlas directo en la conversación. Describí en 1-2 frases por imagen qué aporta como referencia — de diseño (estilo, layout, paleta) o de marca (tono, materiales previos) según corresponda. Agregá esa descripción al final de la idea del usuario, bajo un encabezado "Referencias visuales adjuntas:". Este texto es lo que hace que la sección "## Referencias visuales" del Paso 7 tenga contenido, y también alimenta el Paso 3 si las imágenes son de la marca.

---

### Paso 2 — Perfil de público objetivo

Antes de armar el cuestionario, necesitás tener claro a quién se busca convencer. Dos caminos, preguntale cuál aplica:

> "¿Ya tenés armado el perfil de a quién le hablás — industria, rol, qué le importa? Pegámelo. Si no, te hago unas preguntas rápidas para armarlo."

**Si el usuario ya tiene un perfil** (documento o texto describiendo industria, rol, objeciones típicas, qué le importa): tomalo tal cual, y solo completá con el cuestionario de abajo los campos que falten.

**Si no tiene nada armado**, cubrí estos 6 campos con preguntas de opción múltiple — sin texto libre, mismo formato que el Paso 5:

1. **Rol y nivel de decisión** — ¿la persona que ve esto es quien decide, alguien que influye, o alguien que filtra antes de escalarlo a otro?
2. **Objetivo o dolor específico** — no un dolor genérico de la industria: el dolor puntual de ESTA persona frente a lo que la idea ofrece.
3. **Objeción principal** — qué la hace dudar o decir que no: precio, confianza, complejidad, urgencia, u otra.
4. **Qué necesita ver o sentir para decir que sí** — la señal concreta de convencimiento (se conecta con el criterio de éxito del Paso 6).
5. **Etapa del proceso de compra** — recién explorando, comparando opciones, o lista para decidir.
6. **Canal de consumo** — dónde la va a ver: reunión en vivo, link por correo, redes, u otro. Afecta formato y nivel de detalle.

Guardá el resultado como "perfil de público objetivo" del proyecto. Si el MCP `cc-brew` está disponible, ofrecé reutilizar un perfil guardado de un proyecto anterior antes de preguntar de cero (`get_audience_profiles`) — ver Paso 9.

---

### Paso 3 — Lineamientos de marca

No asumas que el usuario tiene un manual de marca armado — la mayoría de las pymes no lo tiene. Preguntá con las cuatro vías abiertas, combinables:

> "¿Tenés lineamientos de marca? Puedo trabajar con lo que tengas: un manual en PDF, capturas de tu sitio o campañas anteriores, el link de tu sitio actual, o si no tenés nada de eso, te hago un par de preguntas rápidas. Podés combinar más de uno."

Según lo que aporte:

1. **Documento formal** (PDF u otro manual de marca): leélo directo — paleta de colores, tipografía, tono de voz, reglas de uso del logo.
2. **Imágenes de referencia** (capturas de sitio, campañas, materiales de venta): describilas como en el Paso 1, enfocado en estilo visual y tono — no una descripción literal.
3. **Link del sitio web actual** (vía de menor fricción, ofrecela primero): pedí la URL y extraé colores, tipografía y tono de voz de la página. Si no podés navegar la URL vos mismo, pedile al usuario que pegue el texto de su sección "Sobre nosotros" y una captura de su home.
4. **Sin nada de lo anterior** — cuestionario corto de respaldo, opción múltiple:
   - Tono de comunicación: ¿formal, cercano/informal, técnico, u otro?
   - Colores principales de la marca, aunque sea a grandes rasgos.
   - Qué evitar — palabras, imágenes o tonos que no representan a la marca.

Consolidá todas las señales recibidas (documento + imágenes + sitio + cuestionario, las que apliquen) en un solo párrafo de "lineamientos de marca" antes de seguir. Este texto alimenta el cuestionario del Paso 4 y la redacción del CLAUDE.md en el Paso 7.

---

### Paso 4 — Generar cuestionario

A partir de la idea + el perfil de público objetivo + los lineamientos de marca, genera **6-10 preguntas de opción múltiple** que cubran estas 4 áreas (en orden de prioridad):

1. **RECORRIDO DEL CLIENTE** — ¿Cómo va a ver/usar esta herramienta el cliente? ¿Cuál es el paso a paso desde que la abre hasta que decide?
2. **ALCANCE v1** — ¿Qué entra exactamente en la primera versión de la pieza? ¿Qué se deja para después? Fuerza a recortar si la idea es grande.
3. **RESTRICCIONES** — Plataforma (web/móvil/desktop), stack preferido, qué ya existe, integraciones externas necesarias.
4. **REACCIÓN ESPERADA** — ¿Qué decisión o acción concreta tiene que tomar el cliente al terminar de verla? (pedir cotización, agendar llamada, decir que sí en la reunión)

Además cubre si no está claro en la idea:
- La objeción específica que la pieza tiene que resolver (ya la tenés del Paso 2 — no la repreguntes, pero verificá que el cuestionario apunte ahí)
- Dependencias externas críticas: pagos reales, auth social, SMS, APIs de terceros

**Reglas del cuestionario:**
- Opciones como chips/botones numerados (3-4 por pregunta), no texto libre
- Las opciones de alcance siempre incluyen una conservadora: "Solo el núcleo", "Sin X por ahora"
- Idioma: español
- NO preguntes lo que ya está claro en la idea, el perfil de público objetivo, o los lineamientos de marca

---

### Paso 5 — Presentar preguntas

Presenta **cada pregunta por separado**. Espera la respuesta antes de continuar.

Formato de cada pregunta:

```
**Pregunta 2 de 8**

¿Qué describe mejor el alcance de la primera versión?

1. Solo el flujo central — sin extras
2. Flujo central + notificaciones básicas
3. Versión completa con dashboard y analytics
4. Primero el backend, luego el frontend

Responde con el número (o escribe tu respuesta si ninguna aplica).
```

Si la respuesta es ambigua, pide una clarificación corta antes de continuar.

---

### Paso 6 — Evaluar con semáforo

Con la idea + el perfil de público objetivo + los lineamientos de marca + todas las respuestas, evalúa estos 6 criterios:

| Criterio | Score | ¿Qué mide? |
|---|---|---|
| `claridad_objecion` | 0-2 | ¿Está clara la objeción o necesidad puntual del cliente que la pieza tiene que resolver? No un dolor genérico — el de esta persona. |
| `alcance_v1` | 0-2 | ¿El alcance de la herramienta es concreto y acotado? ¿Hay cosas explícitamente excluidas? |
| `recorrido_cliente` | 0-2 | ¿Hay un recorrido definido de cómo el cliente ve/usa la pieza, paso a paso? |
| `dependencias_externas` | 0-2 | ¿Sin dependencias complejas sin resolver (pagos, auth, APIs de terceros)? |
| `coherencia` | 0-2 | ¿Las respuestas del cuestionario son coherentes entre sí y con la idea original? |
| `viabilidad` | 0-2 | ¿Tamaño apropiado para construirse en una sesión? ¿Sin bloqueos técnicos evidentes? |

**Scores:** 0 = rojo (no cumple), 1 = amarillo (parcial), 2 = verde (cumple)

**Regla de bloqueo:**
- `claridad_objecion` = 0 → pide más info antes de generar el CLAUDE.md
- `alcance_v1` = 0 → pide más info antes de generar el CLAUDE.md
- Resto de criterios en 0 o 1 → advertencias, pero no bloquean

**Preguntas de seguimiento:** si algún criterio queda en 0 o 1, genera 1-2 preguntas específicas dirigidas a ese criterio. Preséntalas antes de generar el CLAUDE.md.

**Criterio de éxito obligatorio:** antes de pasar el semáforo, tiene que quedar definida una frase medible de qué reacción o decisión se espera del cliente al ver/usar la herramienta (ej. "pide una cotización", "agenda una llamada", "dice que sí en la reunión"). Si no está clara, es parte de lo que bloquea `claridad_objecion`.

---

### Paso 7 — Generar CLAUDE.md

Genera el documento con esta estructura exacta:

```markdown
# [Nombre descriptivo de la herramienta] — v1

## La objeción a resolver
[Qué duda o resistencia tiene el cliente, y cómo esta pieza la resuelve — 2-3 frases directas. Empieza por la objeción, no por la herramienta.]

## Perfil de público objetivo
- Rol y nivel de decisión: [decisor / influenciador / filtro]
- Objetivo o dolor específico: [el dolor puntual de esta persona]
- Objeción principal: [precio / confianza / complejidad / urgencia / otra]
- Qué necesita ver o sentir para decir que sí: [señal concreta]
- Etapa del proceso de compra: [explorando / comparando / lista para decidir]
- Canal de consumo: [reunión en vivo / link por correo / redes / otro]

## Lineamientos de marca
[Resumen consolidado de tono, paleta, tipografía y reglas de marca recibidas en el Paso 3 — solo lo que aplica según lo que el usuario aportó. Si no se recibió ningún lineamiento, omití esta sección completa.]

## Recorrido del cliente (happy path)
1. [Paso 1 — qué ve/hace el cliente primero]
2. [Paso 2]
3. [Paso 3]
[continuar hasta la decisión final]

## Criterio de éxito de v1
Al terminar de ver/usar la herramienta, [tipo de cliente] [reacción o decisión concreta esperada] — no un criterio técnico, la señal de que la pieza convenció.

## Complejidad del proyecto
**[Baja / Media / Alta]** — [1 frase que justifica la categoría basada en flujos, integraciones y alcance]

- 🟢 Baja: un flujo principal, sin integraciones externas, datos simples, sin auth compleja
- 🟡 Media: 2-3 flujos, 1-2 integraciones (auth, una API), datos relacionales moderados
- 🔴 Alta: múltiples flujos, pagos reales, tiempo real, múltiples roles o integraciones complejas

## Restricciones
- Plataforma: [web / móvil / desktop / CLI]
- Stack: [preferido o recomendado si no se especificó]
- Integraciones: [listar solo las necesarias para v1, o "ninguna" si aplica]

## Alcance v1 — incluye
- [Feature 1 — el núcleo mínimo]
- [Feature 2]

## Alcance v1 — excluye (construir después)
- [Cosa 1 — mockear o simular por ahora]
- [Cosa 2]

## Stack recomendado
[Stack simple y local: HTML/JS para web simple, Next.js para apps, SQLite para datos locales. Sin infra pesada en v1. Si el usuario tiene preferencias, úsalas.]

## Referencias visuales
[Solo si el usuario compartió imágenes en el Paso 1 o el Paso 3: resumí en 1-2 frases por imagen qué guía de diseño o de marca aporta cada una. Si no hubo imágenes, omití esta sección completa — sin dejar el título vacío.]

## SEO y visibilidad en IA
[Solo si la plataforma es web Y la pieza es de cara al público (no un CLI, no una herramienta interna): meta title/description, Open Graph tags, sitemap.xml, robots.txt, verificación de Google Search Console, datos estructurados JSON-LD si aplica, URLs semánticas. Sumá también visibilidad para IA: un archivo llms.txt en la raíz que describa el sitio en texto plano para agentes/crawlers de IA, y contenido bien estructurado (FAQs con schema.org/FAQPage) para que ChatGPT, Perplexity o el buscador de Claude puedan encontrar y citar la herramienta. Si no aplica, omití esta sección completa.]

## Backend y base de datos
[Solo si la pieza necesita persistir datos compartidos entre usuarios, autenticación, o almacenamiento: recomendá UNA opción concreta de entre las más usadas — Supabase, Firebase, Neon, PlanetScale o Convex — según lo que la pieza realmente necesita (Supabase o Firebase si hace falta auth + storage + DB en un combo; Neon o PlanetScale si alcanza con una DB relacional gestionada; Convex si es reactiva en tiempo real). Si el usuario ya pidió o mencionó una opción específica, usá esa. Pasos de CLI de la opción elegida. Si no necesita backend, omití esta sección completa.]

## Deploy
[Solo si es una pieza web que se va a desplegar: recomendá UNA opción concreta de entre las más usadas — Netlify, Vercel, Cloudflare Pages, Railway o Render — según el tipo de proyecto (Netlify o Vercel para sitios/apps estáticas o Next.js; Railway o Render si corre un servidor persistente o backend propio). Si el usuario ya pidió o mencionó una opción específica, usá esa. Instalación del CLI, login, y comando de publicación de la opción elegida. Si no aplica, omití esta sección completa.]

## Repositorio
[Solo si la pieza se despliega o necesita control de versiones remoto: GitHub es la opción más usada — `gh repo create <nombre> --private --source=. --remote=origin`, y conectarlo al deploy elegido para deploys automáticos en cada push. Si el usuario ya usa GitLab o Bitbucket, usá esa plataforma en su lugar. Si no aplica, omití esta sección completa.]

## v2+ — visión de escalamiento (bloqueada — no ejecutar ahora)
- [Feature que ampliaría el alcance a más clientes o casos]
- [Feature 2]

## Primeros 3 pasos
1. [Acción concreta hoy — configurar entorno, crear repo, o escribir la función central del core]
2. [Construir la pieza mínima del recorrido del cliente — lo que demuestra que funciona]
3. [Primer checkpoint de validación — mostrarla a alguien real y ver si reacciona como se espera]

---
*Generado por CC Brew · No ejecutar v2+ hasta validar v1*
```

**Regla estricta para v2+:** filtra cualquier detalle técnico de features de Fase 2 y redúcelo a una sola frase de intención. El objetivo es que Claude Code al leer el documento no se desvíe hacia esa complejidad.

**Regla de complejidad:** evalúa y elige UNA categoría basándote en señales objetivas del proyecto:
- **Baja**: 1 flujo principal, sin pagos, sin auth social, sin tiempo real, datos simples (lista, formulario, CRUD básico)
- **Media**: 2-3 flujos, auth (email/social), 1 API externa, notificaciones, datos con relaciones
- **Alta**: pagos reales (Stripe/Wompi), tiempo real (sockets), múltiples roles de usuario, más de 2 integraciones externas, lógica de negocio compleja
No menciones tiempo — la categoría es sobre scope y dependencias, no sobre velocidad del desarrollador.

**Regla de secciones condicionales** (Referencias visuales, SEO, Backend, Deploy, Repositorio, Lineamientos de marca): evaluá cada una de forma independiente según lo que ESTA pieza realmente necesita — no las incluyas todas por default ni las omitas todas por default. Un CLI tool o script local no lleva SEO ni Netlify. Una pieza que no comparte datos entre usuarios no lleva Supabase. Nunca dejes un título de sección seguido de un placeholder sin completar — si no aplica, el título entero desaparece del documento.

---

### Paso 8 — Guardar CLAUDE.md localmente

Escribe el archivo en el directorio actual usando la herramienta de escritura de archivos o Bash:

```bash
# Escribe el CLAUDE.md en el directorio actual del proyecto
```

Confirma al usuario que el archivo fue guardado.

---

### Paso 9 — Sincronizar con CC Brew (opcional)

Si el MCP `cc-brew` está disponible en la sesión, sincroniza el resultado con la PWA para que el usuario pueda verlo en `ccbrew.kitifica.com`:

1. **Crear sesión:** llama `create_session` con el nombre del proyecto. Guarda el `session_id` devuelto.

2. **Guardar idea:** llama `save_idea` con el `session_id` y el texto original de la idea del usuario.

3. **Perfiles reutilizables:** si vas a construir el perfil de público objetivo desde cero (Paso 2), llama primero `get_audience_profiles` para ofrecer reutilizar uno existente. Al terminar el Paso 2, llama `save_audience_profile` con el `session_id` y el perfil resultante. Al terminar el Paso 3, llama `save_brand_profile` con el `session_id` y el párrafo consolidado de lineamientos de marca.

4. **Guardar cuestionario:** llama `save_questionnaire` con el `session_id` y el objeto de preguntas generadas:
   ```json
   { "questions": [{ "id": "q1", "text": "...", "type": "single", "options": ["...", "..."] }] }
   ```

5. **Guardar evaluación:** llama `save_evaluation` con el `session_id`, el objeto semáforo, y el contenido del CLAUDE.md.

   Formato del semáforo:
   ```json
   {
     "claridad_objecion": 2,
     "alcance_v1": 1,
     "recorrido_cliente": 2,
     "dependencias_externas": 2,
     "coherencia": 1,
     "viabilidad": 2,
     "mensajes": {
       "claridad_objecion": "Objeción clara y específica.",
       "alcance_v1": "Falta acotar qué queda fuera de v1.",
       "recorrido_cliente": "Recorrido bien definido paso a paso.",
       "dependencias_externas": "Sin dependencias complejas.",
       "coherencia": "Una respuesta contradice el alcance elegido.",
       "viabilidad": "Tamaño apropiado."
     }
   }
   ```

Si el MCP no está conectado o algún paso falla, omite este paso y avisa al usuario que el CLAUDE.md local es suficiente para empezar.

---

### Paso 10 — Mostrar resultado

Muestra el semáforo al usuario:

```
📊 EVALUACIÓN CC BREW

🟢 Claridad de la objeción   — [mensaje breve]
🟡 Alcance v1                — [mensaje breve]
🟢 Recorrido del cliente     — [mensaje breve]
🟢 Dependencias externas     — [mensaje breve]
🟡 Coherencia                — [mensaje breve]
🟢 Viabilidad                — [mensaje breve]

✅ CLAUDE.md guardado en este directorio.
```

Usa: 🟢 para score=2, 🟡 para score=1, 🔴 para score=0.

Luego pregunta: "¿Arrancamos con los primeros 3 pasos, o quieres ajustar algo del alcance?"

---

## Instalación (para el usuario)

Para usar este Skill, necesitas:

**1. Instalar el MCP de CC Brew** (desde `ccbrew.kitifica.com/instalar`):
```bash
claude mcp add cc-brew --transport http "https://cc-brew-mcp.netlify.app/mcp" \
  --header "Authorization: Bearer TU_API_KEY" --scope user
```

**2. Instalar el Skill:**
```bash
mkdir -p ~/.claude/skills/cc-brew
curl -o ~/.claude/skills/cc-brew/SKILL.md \
  https://ccbrew.kitifica.com/skill/SKILL.md
```

**3. Activar en CLAUDE.md** (global o por proyecto):
```markdown
# cc-brew
- **cc-brew** (`~/.claude/skills/cc-brew/SKILL.md`) - convierte una idea en una herramienta que convence a un cliente
Trigger: `/cc-brew`
```

Luego usa `/cc-brew` desde cualquier directorio en Claude Code.
