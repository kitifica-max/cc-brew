# Copy Analysis & Suggestions: ccbrew.kitifica.com/landing/
**Date:** 2026-08-27
**Page Type:** Landing Page (híbrida: producto + dos rutas de entrada)
**Copy Score:** 68/100

> Reemplaza el audit anterior (23-ago, sobre CC Creator / ccc.kitifica.com — marca y dominio ya no existen). Esta versión evalúa el landing actual, post-pivote a CC Brew.

---

## Executive Summary

El copy en sí ya está bien calibrado — el H1 nombra la audiencia ("convence al cliente"), la sección de posicionamiento tiene un argumento de diferenciación real y específico, y los 6 criterios + los 3 fracasos son munición de venta genuina, no relleno. El problema que describís no es de palabras, es de **secuencia**: las dos secciones que sí le hablan directo a marketing/ventas (Posicionamiento y Metodología/3 fracasos) están enterradas detrás de contenido mecánico — instalación móvil, stack técnico — que no es para esa audiencia y que le quita el momentum al argumento justo cuando debería estar construyéndose.

El síntoma concreto: un lector de marketing llega al hero (correcto, le habla a él), y lo siguiente que ve es una sección entera sobre cómo instalar una PWA sin App Store. Eso no es su problema. El argumento real — "las herramientas todo-en-uno te rentan una plantilla" — no aparece hasta la tercera sección. Para cuando llega a la munición de venta más fuerte (Metodología, los 3 fracasos), ya bajó 7 secciones y probablemente ya se fue.

La página también alterna de audiencia sin avisar: Posicionamiento (marketing) → Cómo funciona (neutral) → Stack técnico ("Supabase, CLI de Netlify...") (developer) → Semáforo (marketing) → Metodología (marketing) → Routes (neutral) → Skill/MCP (developer). Ese zigzag es lo que hace que "no convenza" — no es un problema de persuasión palabra por palabra, es que el lector correcto tiene que esperar entre secciones que no son para él.

**El fix no es reescribir — es reordenar.** Ver la sección "Reordenamiento recomendado" abajo; es el cambio de mayor impacto de todo este reporte.

---

## Voice & Tone Profile

| Dimensión | Score | Análisis |
|---|---|---|
| Formalidad | 2/5 | Casual-directo, tuteo. Correcto para founders/marketers que deciden solos. |
| Emoción | 6/10 | El Posicionamiento y Metodología tienen carga real ("plantilla que ya usó tu competencia"). Se diluye cuando quedan separadas por contenido neutro. |
| Complejidad | 3/5 | Mixta a propósito — hay secciones simples (Hero, Problema) y secciones técnicas (Stack, Skill). El problema no es la complejidad en sí, es que están intercaladas en vez de agrupadas. |
| Humor | 1/5 | Serio, sin intentos de humor. Consistente en toda la página. |
| Autoridad | 4/5 | El Semáforo y Metodología suenan a alguien que investigó el problema real, no a copy genérico. Es la mejor arma de la página y está subutilizada por posición. |

**Recomendación de voz:** no tocar el tono — el problema es arquitectura, no voz.

---

## Score Breakdown

### Clarity — 8/10
- ✅ H1 nombra qué es y para quién: "una herramienta a tu medida que convence al cliente"
- ✅ Los 6 criterios y los 3 fracasos son específicos, no genéricos
- ❌ Nada en el hero o el eyebrow dice explícitamente "esto es para marketing y ventas" — se infiere de la redacción, no se declara. Un visitante que escanea en 2 segundos puede no captarlo.
- ❌ El orden de secciones no refuerza la claridad — un lector tiene que reconstruir mentalmente "ah, esto es para mí" cada vez que la página vuelve a hablarle a él después de una sección técnica

### Persuasion — 5/10
- ✅ El contenido persuasivo (Posicionamiento, Metodología) es genuinamente bueno cuando se lee
- ❌ **Está mal ubicado.** Metodología (los 3 fracasos, la sección más persuasiva de toda la página) es la 8va sección de contenido. La mayoría de visitantes de landing no llegan tan lejos.
- ❌ El arco de persuasión estándar es Problema → Solución → Prueba → Objeciones → Ask. Acá es: Hero → Instalación móvil → Problema → Cómo funciona → Stack técnico → Semáforo → Metodología → Rutas. El "por qué te importa" y el "por qué confiar" están separados por 4 secciones de contenido neutro/técnico.

### Specificity — 8/10
- ✅ Precios exactos, nombres de herramientas reales (Supabase, Netlify, GitHub), 6 criterios nombrados uno por uno
- ✅ Los 3 fracasos tienen ejemplos concretos, no abstractos
- Sin cambios necesarios acá — es un punto fuerte real de la página

### Emotion — 6/10
- ✅ "antes de que la idea se pierda" (hero), "plantilla que ya usó tu competencia" (posicionamiento) — ambas aterrizan
- ❌ Emoción se resetea cada vez que entra una sección mecánica (instalación, stack) — el lector nunca acumula tensión hacia el CTA

### Action — 7/10
- ✅ CTAs presentes a intervalos razonables, texto de botón específico ("Estructurar mi idea gratis →" no "Empezar")
- ❌ El primer CTA después del hero está seguido de una sección (App Directa) que no refuerza la promesa que el CTA acaba de hacer

**Total: 34/50 → 68/100**

---

## Value Proposition Canvas

```
TARGET CUSTOMER:   Equipos de marketing/ventas que necesitan una herramienta
                    web a la medida para convencer a un cliente específico
                    (no developers construyendo un producto propio)
PROBLEM:           Las herramientas todo-en-uno (Navattic, Storylane, Lovable,
                    Emergent) rentan una plantilla genérica — el resultado se
                    parece al de cualquier otro cliente que use el mismo editor
SOLUTION:          CC Brew arma el brief (marca + perfil de cliente + objeción
                    a resolver) para que Claude Code construya con libertad
                    total de stack — no una plantilla rentada
UNIQUE MECHANISM:  Perfil de cliente + lineamientos de marca como input real
                    al CLAUDE.md, más el semáforo de 6 criterios antes de construir
KEY BENEFIT:       Una herramienta que es tuya, evoluciona con tu marca, y
                    ataca la objeción real del cliente — en minutos, no semanas
PROOF:             6 criterios de validación + metodología de "3 fracasos"
                    con causa raíz nombrada — pero mal ubicados en la página
```

**Gap identificado:** el Value Prop está completo y es bueno — el Canvas no tiene huecos. El problema es 100% de exposición: las piezas que prueban PROOF y SOLUTION existen pero están detrás de contenido que no las necesita.

---

## Reordenamiento recomendado (el cambio de mayor impacto)

### Orden actual
1. Hero
2. Feature bar
3. **App Directa** ← mecánica de instalación móvil, no habla de audiencia
4. Posicionamiento ("plantillas genéricas")
5. Cómo funciona
6. **Stack técnico** (Supabase/Netlify/GitHub/GSC) ← lenguaje de developer
7. Semáforo (6 criterios)
8. Metodología (3 fracasos) ← la sección más persuasiva, casi al final
9. Routes
10. Pricing
11. **Skill/MCP** ← técnico, instalación en Claude Code
12. FAQ
13. CTA final

### Orden recomendado
1. Hero — sin cambios
2. Feature bar — sin cambios
3. **Posicionamiento** ↑ (de #4 a #3 — sube justo después del hero, mientras el momentum está más alto)
4. Cómo funciona — sin cambios de posición relativa
5. **Metodología (3 fracasos)** ↑↑↑ (de #8 a #5 — la munición de venta más fuerte, ahora refuerza el mecanismo recién explicado en vez de esperar 3 secciones más)
6. Semáforo — se mantiene pegado a Metodología (son la misma familia de argumento: rigor + prueba)
7. Routes — sin cambios de posición relativa
8. **App Directa** ↓ (de #3 a #8 — ahora elabora la ruta paga que Routes acaba de introducir, en vez de interrumpir el hero)
9. Pricing — sin cambios de posición relativa
10. **Stack técnico** ↓ (de #6 a #10 — pasa a ser refuerzo/reassurance tardío, no argumento primario)
11. Skill/MCP — sin cambios de posición relativa (contenido técnico, correcto que esté tarde)
12. FAQ — sin cambios
13. CTA final — sin cambios

**Por qué este orden funciona:** agrupa las 5 secciones "marketing-facing" (Hero, Posicionamiento, Cómo funciona, Metodología, Semáforo) en un bloque continuo sin interrupciones técnicas — el lector de marketing recorre TODO el argumento de venta sin salirse de su carril. Las secciones técnicas (Stack, Skill/MCP) quedan agrupadas al final, disponibles para quien las busca (developers evaluando la ruta gratis) sin diluir el pitch principal. App Directa se reubica para reforzar Routes en vez de competir con el Posicionamiento por la atención inmediata post-hero.

**Nav:** el link "App Directa" es hoy el primero en el menú — reforzaría reordenarlo también, después de "Precios", para que coincida con su nueva posición en la página.

---

## Headline Recommendations

**H1 actual:** *"De tu idea a una herramienta a tu medida que convence al cliente — en 3 minutos."*

Ya cumple el test de 5 segundos (qué hace + para quién). No lo tocaría — el problema no está acá. Alternativas solo si quieren probar variantes en A/B:

1. **(PAS)** "Tu cliente ya vio 10 herramientas iguales. Dale una que sea tuya — en 3 minutos." — agita el problema (plantilla genérica) directo en el H1
2. **(4U)** "La herramienta que convence porque tiene tu marca, no una plantilla rentada — en 3 minutos con Claude Code" — más largo, más específico sobre el mecanismo
3. **(Before-After-Bridge)** "De una idea sin forma a una herramienta que tu cliente reconoce como tuya — CC Brew arma el brief en 3 minutos"
4. Variante corta: "Deja de rentar plantillas. Construí algo que es tuyo — en 3 minutos."
5. Variante con objeción directa: "¿No sabés qué objeción resolver? CC Brew te ayuda a definirla antes de construir."

**Recomendación:** mantener el H1 actual. Si prueban variantes, la #1 (PAS) es la más alineada con el Posicionamiento ya escrito.

### Quick win no incluido en el orden: eyebrow de audiencia explícito

El badge actual sobre el H1 dice: `"Gratis con Claude Code · Planes desde $4"` — es un dato de precio, no de audiencia. Ningún elemento en el fold declara explícitamente "esto es para equipos de marketing y ventas". Se infiere del H1, pero no se afirma.

**Antes:**
```html
<div class="hero-badge">Gratis con Claude Code · Planes desde $4</div>
```

**Después (agregar arriba del badge existente, no reemplazarlo):**
```html
<span class="eyebrow" style="margin-bottom:10px;">Para equipos de marketing y ventas</span>
```

**Por qué:** es la forma más barata de resolver "el orden no comunica el público objetivo" — una etiqueta de 4 palabras arriba del H1, antes de que el lector tenga que inferir nada.

---

## Section-by-Section Copy Suggestions

### Posicionamiento (subir a #3)
Copy actual ya es fuerte — sin cambios de texto, solo de posición. Es el mejor argumento de diferenciación de la página y hoy lo lee menos gente de la que debería por estar en la posición #4 detrás de una sección de instalación móvil.

### Metodología / 3 fracasos (subir a #5)
Mismo caso — copy fuerte, posición equivocada. Al subir, considerar acortar el intro de 3 líneas a 2 para que la sección se sienta como continuación directa de "Cómo funciona" en vez de un bloque nuevo.

### App Directa (bajar a #8)
El copy está bien para lo que es (reassurance de "funciona en tu celular"), pero al bajarlo, el kicker actual — *"El nuevo estándar de Kitifica"* — puede sonar desconectado si ya pasaron 7 secciones. Sugerido:

**Antes:** `App Directa · El nuevo estándar de Kitifica`
**Después:** `App Directa · La ruta paga, explicada`

Conecta explícitamente con la sección Routes que la antecede en el nuevo orden, en vez de sonar a anuncio suelto.

### Stack técnico (bajar a #10)
Sin cambios de copy — el texto ya se dirige correctamente a quien lo necesita ("cuando tu proyecto lo necesita"). Solo cambia de posición para no interrumpir el bloque de marketing.

---

## CTA Optimization

| CTA | Ubicación | Texto actual | Veredicto |
|---|---|---|---|
| Nav | Header | "Estructurar mi idea →" | ✅ Específico, en primera persona implícita |
| Hero primario | Hero | "Estructurar mi idea gratis →" | ✅ Incluye el valor (gratis) |
| Hero secundario | Hero | "Ver precios → desde $4" | ✅ Reduce fricción con precio visible |
| Problema | Posicionamiento | "Estructurar mi próxima idea →" | ✅ Consistente |
| Semáforo | Semáforo | "Probar con mi idea →" | ✅ Bien |
| Pricing | Cada plan | "Empezar con 5 proyectos →" / "Elegir Creador — 12 proyectos" | ✅ Específico con cantidad, no genérico |
| CTA final | Cierre | "Abrir la app →" | ⚠️ Es el único CTA genérico de la página — todos los demás incluyen el valor o la cantidad |

**Antes:** `Abrir la app →`
**Después:** `Estructurar mi idea ahora →`

**Por qué:** es el último CTA que el lector ve — debería repetir la promesa específica del hero, no un verbo genérico de navegación ("abrir").

Placement: hay CTA above the fold (✅), después de las secciones principales (✅), y al cierre (✅). No hace falta un sticky CTA — la página no es tan larga como para necesitarlo.

---

## Before/After Examples

**1. Eyebrow de audiencia (nuevo elemento, no existía)**
```
ANTES: (nada — el hero empieza directo en el badge de precio)
DESPUÉS: "Para equipos de marketing y ventas" arriba del H1
POR QUÉ: declara la audiencia en vez de esperar que se infiera del H1
```

**2. Orden de secciones (el cambio principal de este reporte)**
```
ANTES: Hero → App Directa → Posicionamiento → Cómo funciona → Stack → Semáforo → Metodología → Routes
DESPUÉS: Hero → Posicionamiento → Cómo funciona → Metodología → Semáforo → Routes → App Directa → Stack
POR QUÉ: agrupa todo el contenido marketing-facing sin interrupciones técnicas; sube la sección más persuasiva (Metodología) de la posición #8 a la #5
```

**3. CTA final**
```
ANTES: "Abrir la app →"
DESPUÉS: "Estructurar mi idea ahora →"
POR QUÉ: el único CTA sin valor específico de toda la página — los otros 6 CTAs sí lo tienen
```

**4. Kicker de App Directa**
```
ANTES: "App Directa · El nuevo estándar de Kitifica"
DESPUÉS: "App Directa · La ruta paga, explicada"
POR QUÉ: en su nueva posición (después de Routes), debe conectar con lo que la antecede, no sonar a anuncio aislado
```

**5. Nav — orden de links**
```
ANTES: App Directa · Cómo funciona · Precios · FAQ
DESPUÉS: Cómo funciona · Precios · App Directa · FAQ
POR QUÉ: refleja la nueva jerarquía — App Directa ya no es lo segundo que se le ofrece al lector
```

---

## Swipe File

### 10 alternativas de H1 (ranking por efectividad estimada)
1. *(actual — mantener)* "De tu idea a una herramienta a tu medida que convence al cliente — en 3 minutos."
2. "Tu cliente ya vio 10 herramientas iguales. Dale una que sea tuya — en 3 minutos."
3. "Deja de rentar plantillas. Construí algo que es tuyo — en 3 minutos."
4. "La herramienta que convence porque tiene tu marca, no una plantilla rentada."
5. "De una idea sin forma a una herramienta que tu cliente reconoce como tuya."
6. "¿No sabés qué objeción resolver? CC Brew te ayuda a definirla antes de construir."
7. "Marketing y ventas: construyan la herramienta que su cliente necesita, no la que el editor les permite."
8. "3 minutos de brief. Una herramienta que es 100% de tu marca."
9. "El brief que le falta a Claude Code para convencer a tu cliente — no solo construir algo funcional."
10. "De idea a herramienta con tu marca adentro — sin plantillas, sin semanas de desarrollo."

### 5 alternativas de subheadline
1. *(actual — mantener)* "Una plantilla genérica no convence a nadie en particular. CC Brew toma tu marca y el perfil de tu cliente como input real..."
2. "Tu marca, el perfil de tu cliente, y la objeción real que hay que resolver — eso es lo que Claude Code necesita para construir algo que convenza, no solo que funcione."
3. "Editores como Lovable o Navattic te rentan su plantilla. CC Brew le da a Claude Code lo que necesita para construir algo tuyo."
4. "3 minutos, un cuestionario dirigido a la objeción de tu cliente, y un CLAUDE.md listo para Claude Code."
5. "Sin plantilla rentada. Sin semanas de desarrollo a medida. Tu marca, en minutos."

### 5 alternativas de CTA
1. *(actual — mantener)* "Estructurar mi idea gratis →"
2. "Estructurar mi idea ahora →"
3. "Armar mi brief gratis →"
4. "Empezar con mi próximo cliente →"
5. "Ver cómo funciona con mi idea →"

### 3 alternativas de meta description
1. *(actual — mantener)* "CC Brew convierte tu idea en el brief de una herramienta de marketing o ventas a tu medida..."
2. "Para equipos de marketing y ventas: convertí tu idea en una herramienta a la medida de tu marca que convence a un cliente específico. Gratis con Claude Code."
3. "Deja de rentar plantillas genéricas. CC Brew arma el brief — marca, cliente objetivo, objeción a resolver — para que Claude Code construya algo tuyo. Desde $4."

### 3 alternativas de framing de social proof
La página no tiene social proof cuantificado (testimonios, número de usuarios, casos). No es parte del pedido de hoy, pero queda anotado para un próximo pase — ver Implementation Priority.
1. "Usado por equipos de marketing que ya no rentan plantillas" (si hay datos para respaldarlo)
2. Certificación Kitifica ya existe en el hero (`99 Performance · 100 SEO · PWA`) — es la única prueba social actual, y es técnica, no de resultado de negocio
3. Considerar: "X herramientas construidas este mes" si el dato existe y es defendible

---

## Implementation Priority

| # | Cambio | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Reordenar secciones (Posicionamiento y Metodología suben, App Directa y Stack bajan) | Medio — mover bloques HTML, sin reescribir copy | **Alto** — es la causa raíz del problema reportado |
| 2 | Agregar eyebrow "Para equipos de marketing y ventas" sobre el hero | Bajo | Alto — declara audiencia sin esperar inferencia |
| 3 | Reordenar nav para reflejar la nueva jerarquía | Bajo | Medio |
| 4 | CTA final: "Abrir la app" → "Estructurar mi idea ahora" | Bajo | Medio |
| 5 | Kicker de App Directa ajustado a su nueva posición | Bajo | Bajo |
| 6 | (Futuro, fuera de alcance de hoy) Agregar social proof cuantificado — cero testimonios/métricas hoy | Alto (necesita datos reales) | Alto a mediano plazo |
