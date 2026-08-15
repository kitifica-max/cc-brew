# Copy Analysis & Suggestions: CC Creator Landing + README
**Fecha:** 2026-08-14
**Tipo:** Landing Page + README GitHub
**Score actual:** 36/100

---

## Resumen ejecutivo

El copy actual fue escrito para CC Controller, un "control remoto para Claude Code". El producto evolucionó a CC Creator — un **sistema guiado de 6 fases para construir Apps Directas desde tu iPhone con Claude como copiloto**. Esta es una diferencia de categoría, no de nombre.

**El problema central:** la landing y el README venden una utility tool cuando el producto real es un estudio de apps completo. El copy más poderoso disponible (el sistema de 6 fases, la filosofía Kitifica Local First, el concepto App Directa) no aparece en ninguna parte visible.

**La imagen hero `mu_2_ccc.png` ya cuenta la historia correcta** — muestra exactamente las 6 fases. El copy debe acompañarla.

Cambios necesarios: radical en el posicionamiento (nueva categoría), quirúrgico en el resto (preservar lo que funciona: precio, seguridad, FAQ).

---

## Perfil de voz y tono

| Dimensión | Score actual | Recomendación |
|-----------|-------------|---------------|
| Formalidad | 2/5 Casual | Mantener — funciona para devs |
| Emoción | 3/5 Moderado | Subir a 4/5 — la historia es inspiradora |
| Complejidad | 2/5 Simple | Mantener — Claude Code ya es complejo |
| Humor | 1/5 Serio | Subir un poco — se puede ser aspiracional |
| Autoridad | 3/5 Par | Mantener — hablar como dev a dev |

**Voz objetivo:** Dev ambicioso que le habla a otro dev ambicioso. No guru. No corporativo. Alguien que ya usa Claude Code y quiere construir cosas reales.

---

## Desglose del score

| Dimensión | Score | Razón |
|-----------|-------|-------|
| Claridad | 5/10 | "Tu Claude Code. Tu Mac. Tu móvil." es poético pero no explica el nuevo producto. El 5-second test falla para CC Creator. |
| Persuasión | 6/10 | Buen manejo de objeciones (seguridad, precio) pero no hay journey emocional. La promesa central está ausente. |
| Especificidad | 7/10 | Precio claro ($4.99), trial claro (7 días). Las 6 fases son el diferenciador más específico y no aparecen. |
| Emoción | 5/10 | "Tú sigues con tu día" conecta, pero falta la aspiración: construir algo real desde el bolsillo. |
| Acción | 7/10 | CTAs bien ubicados. Texto mediocre ("Instalar — 7 días gratis" puede ser mejor). |

**Total: 30/50 → 60/100**

---

## Análisis de propuesta de valor

```
TARGET: Desarrollador que usa Claude Code (Mac). Tiene ideas de apps.
        Quiere construir sin estar pegado al escritorio.

PROBLEMA ACTUAL (en el copy): "No puedo usar Claude Code desde el móvil."
PROBLEMA REAL (del usuario): "Tengo ideas pero construir una app real lleva semanas
                              de setup, decisiones técnicas y se complica."

SOLUCIÓN EN EL COPY ACTUAL: Control remoto para Claude Code.
SOLUCIÓN REAL: Sistema guiado de 6 fases que convierte ideas en Apps Directas reales,
               con Claude como copiloto que sabe exactamente qué hacer en cada fase.

MECANISMO ÚNICO: CLAUDE.md inyectado por proyecto y fase → Claude tiene contexto
                 perfecto en cada etapa sin que el usuario tenga que explicar nada.

BENEFICIO CLAVE: De la idea a una App Directa certificada, desde el iPhone, guiado
                 por Claude paso a paso.

PRUEBA: Las 6 fases (imagen mu_2_ccc.png), el botón "Avanzar a Fase 2", el sistema
        visible en la app.

GAP CRÍTICO: El copy actual no comunica el mecanismo único ni el beneficio clave.
```

---

## Análisis de secciones actuales

### HERO (crítico — reescribir completo)

**ANTES:**
```
Tu Claude Code.
Tu Mac.
Tu móvil.
```
Tagline: "Controla Claude Code desde tu iPhone. Inicia tareas, dicta instrucciones por voz, cambia de proyecto y sigue el trabajo de Claude en tiempo real. Sin SSH. Sin túneles."

**Problemas:**
- "Tu Claude Code. Tu Mac. Tu móvil." — tres fragmentos que juntos no dicen nada accionable
- "Controla Claude Code desde tu iPhone" posiciona como utility, no como estudio de apps
- La imagen hero era un mockup simulado; ahora tenemos `mu_2_ccc.png` que muestra las 6 fases reales
- No hay mención a App Directa, 6 fases, ni Kitifica Local First

**DESPUÉS — opción A (aspiracional):**
```
Headline: De la idea a tu App Directa.
          Guiado por Claude, desde el iPhone.

Subhead: CC Creator guía a Claude paso a paso a través de 6 fases:
         desde definir tu idea hasta lanzar y certificar tu App Directa.
         Sin estar pegado al escritorio. Sin saber por dónde empezar.
```

**DESPUÉS — opción B (directa / benefit-first):**
```
Headline: Construye una App Directa real.
          Claude sabe exactamente qué hacer en cada fase.

Subhead: 6 fases guiadas: Ideación → POC Local → Lanzamiento → Backend →
         App Directa Completa → Validación. Claude tiene el contexto de tu
         proyecto en todo momento. Tú decides cuándo avanzar.
```

**DESPUÉS — opción C (problema-solución):**
```
Headline: Tenías la idea.
          Ahora tienes el proceso.

Subhead: CC Creator convierte a Claude en tu guía de desarrollo. 6 fases
         que van desde "¿Qué quiero construir?" hasta una App Directa
         certificada por Kitifica. Desde tu iPhone.
```

**Recomendación: Opción A** — Más potente emocionalmente, Clara en 5 segundos, Diferenciador visible.

**Bullets del hero — ANTES:**
- Control desde cualquier lugar
- Instrucciones por voz
- Streaming en tiempo real

**Bullets del hero — DESPUÉS:**
- 6 fases guiadas: de la idea a la App Directa certificada
- Claude tiene el contexto exacto de cada fase — sin repetirle nada
- Controla el avance tú: avanza cuando estés listo
- Desde tu iPhone, mientras tu Mac trabaja

---

### SECCIÓN AHA MOMENT (reubicar / reescribir)

**ANTES:** Chat de "Refactoriza el sistema de autenticación" → "Trabajando en tu Mac…"

**Problema:** Muestra el uso antiguo (control remoto). No muestra el sistema de fases.

**DESPUÉS:** Mostrar el journey de una sesión CC Creator:

```
09:42 📱 → [Nuevo proyecto: mi-tienda]
09:43 🖥️ → Claude: "Hola! Vamos a construir mi-tienda juntos. Soy tu asistente
               de desarrollo. Aquí está el proceso de 6 fases que seguiremos..."
10:05 📱 → [Fase 1 completada. Avanzar a POC Local →]
10:06 🖥️ → Claude: "Perfecto. Iniciando la construcción del POC..."
```

**Punchline nuevo:**
```
Claude no solo ejecuta tareas.
CC Creator lo convierte en tu guía.
Cada fase, exactamente lo que necesitas.
```

---

### SECCIÓN "NO ES OTRO CHATBOT" (renombrar / reescribir)

**ANTES:** "No es otro chatbot. Es tu Claude Code."
— Ya no aplica: CC Creator es mucho más que un bridge.

**DESPUÉS:** "No es un asistente genérico. Es un proceso probado."

```
CC Creator no le dice a Claude "ayúdame a hacer una app".
Le dice: "Estás en la Fase 2 — POC Local. Tu rol es construir
iterativamente, mostrar progreso frecuente y usar el web previewer.
Prioriza funcionalidad core sobre diseño perfecto."

Claude recibe instrucciones específicas por fase, por proyecto.
Sin que el usuario tenga que explicar nada.
```

---

### NUEVA SECCIÓN NECESARIA: Las 6 Fases (insertar después del hero)

Esta es la sección más importante que falta. Debe ir inmediatamente después del hero.

```
Eyebrow: El proceso que funciona
H2: 6 fases. De la idea a la App Directa.

[Grid visual de las 6 fases]

1 · Ideación
Claude escucha tu idea, elige el stack y explica el plan completo.
Filosofía Local First: primero un POC funcional, luego escalar.

2 · POC Local
Construye iterativamente. El web previewer de CC Creator te muestra
el avance en tiempo real desde tu iPhone.

3 · Lanzamiento
Claude te guía para obtener los tokens necesarios, crea el repo
en GitHub y hace el primer deploy en Netlify.

4 · Backend
Conecta Supabase: base de datos, autenticación y storage.
Claude implementa el schema según las necesidades de tu POC.

5 · App Directa Completa
Manifest, service worker, secrets de producción, optimización.
Tu app lista para instalarse desde el navegador.

6 · Validación
Claude abre kitifica.com/validador/ con la URL de tu proyecto.
Certificación Kitifica: tu App Directa funciona como debe.

[CTA: Empieza tu primera App Directa →]
```

---

### SECCIÓN FEATURES (actualizar 3 de 6 cards)

**Cards a mantener sin cambio:** Habla con Claude (voice), Streaming en tiempo real, Envía archivos

**Cards a actualizar:**

**ANTES:** "Controla tus proyectos" → carpeta, lista de proyectos
**DESPUÉS:** "Sistema de 6 fases"
```
CC Creator guía a Claude con las instrucciones correctas en cada fase.
Tú avanzas cuando estás listo. Claude sabe exactamente qué hacer en cada etapa.
[Visual: pill "Fase 1 · Ideación ▸" → panel de fases]
```

**ANTES:** "Acciones rápidas" → botones sí/no/continuar
**DESPUÉS:** "Secrets por categoría"
```
GitHub, Netlify, Supabase, custom. Cada secret aparece cuando lo necesitas,
en la fase correcta. Claude te guía para obtenerlos.
[Visual: cards de categorías con estados ✓/vacío]
```

**ANTES:** "Modelo y esfuerzo" → chips Haiku/Sonnet/Opus
**DESPUÉS:** Mantener pero actualizar visual con el nuevo header de CC Creator

---

### COMPARACIÓN (actualizar columnas)

**ANTES:** CC Creator vs Claude Code (incorrecto — CC Creator requiere Claude Code)

**DESPUÉS:** CC Creator vs "hacerlo tú mismo con Claude Code"

| Característica | Solo Claude Code | CC Creator |
|---|---|---|
| Claude Code en tu Mac | ✓ | ✓ |
| Control desde móvil | — | ✓ |
| Proceso guiado de 6 fases | — | ✓ |
| CLAUDE.md automático por fase | — | ✓ |
| Web previewer integrado | — | ✓ |
| Secrets por categoría | — | ✓ |
| Certificación App Directa | — | ✓ |
| Precio adicional | Incluido | $4.99 una vez |

---

### PRECIO (agregar nuevo benefit)

**Añadir al listado de features del plan:**
- Sistema de 6 fases guiadas
- CLAUDE.md automático por proyecto y fase
- Web previewer integrado
- Secrets organizados por categoría
- Acceso a kitifica.com/validador/

---

### META TAGS (actualizar)

**ANTES:**
```
title: "CC Creator — Tu interfaz móvil para Claude Code"
description: "Controla Claude Code desde tu iPhone. Inicia tareas, dicta instrucciones por voz..."
```

**DESPUÉS:**
```
title: "CC Creator — De la idea a tu App Directa, guiado por Claude"
description: "Sistema de 6 fases que guía a Claude a construir tu App Directa.
              Ideación → POC → Lanzamiento → Backend → App Directa Completa → Validación.
              Desde tu iPhone. $4.99 pago único."
```

---

## CTAs — Antes/Después

| Ubicación | ANTES | DESPUÉS |
|-----------|-------|---------|
| Nav | "Instalar" | "Empezar gratis →" |
| Hero primary | "Instalar — 7 días gratis" | "Empieza tu primera App Directa →" |
| Hero secondary | "Ver en GitHub" | "Ver en GitHub · Open Source" |
| Precio | "Instalar — 7 días gratis" | "Construye tu primera App Directa — 7 días gratis" |
| Final section | (no existe) | "De la idea a tu App Directa. Empieza hoy →" |

---

## Swipe file — Headlines

**Ranked por efectividad estimada:**

1. `De la idea a tu App Directa. Guiado por Claude, desde el iPhone.` ← RECOMENDADO
2. `Construye una App Directa real. Claude sabe qué hacer en cada fase.`
3. `Tenías la idea. Ahora tienes el proceso.`
4. `6 fases. De la idea a una App Directa certificada.`
5. `Claude como guía. Tu iPhone como estudio.`
6. `El estudio de apps que cabe en el bolsillo.`
7. `Construye desde donde estés. Claude tiene el mapa.`
8. `Tu primera App Directa empieza aquí.`
9. `Stop building alone. Claude knows the way.` (si hay versión en inglés)
10. `De la idea al lanzamiento: 6 fases, Claude como copiloto.`

**Subheadlines:**

1. `6 fases guiadas: Ideación → POC Local → Lanzamiento → Backend → App Directa Completa → Validación. Claude tiene el contexto exacto de cada etapa.`
2. `CC Creator guía a Claude con instrucciones específicas por fase y proyecto. Tú decides cuándo avanzar.`
3. `Filosofía Kitifica Local First: primero un POC funcional, luego escalar. Sin sobreingeniería antes de validar.`

**Meta descriptions:**

1. `Sistema de 6 fases que guía a Claude a construir tu App Directa desde el iPhone. Ideación, POC, lanzamiento, backend, optimización y certificación. $4.99 pago único.`
2. `CC Creator convierte a Claude en tu guía de desarrollo. 6 fases desde la idea hasta una App Directa certificada por Kitifica. 7 días gratis.`
3. `De la idea a tu App Directa, desde el iPhone. Claude guiado por fases, CLAUDE.md automático, web previewer integrado. Open Source.`

---

## Plan de implementación — Prioridad

### CRÍTICO (landing rompe sin esto)

1. **Hero: imagen + headline + subhead** — reemplazar `mu_1_ccc.png` → `mu_2_ccc.png`, nuevo headline opción A, nuevos bullets
2. **Nueva sección "6 fases"** — insertar después del hero, antes del aha moment
3. **Meta tags** — título y description actualizados
4. **Badge hero** — "Nuevo · Sistema de 6 fases" en lugar de "Open Source · v1.6.0"

### IMPORTANTE

5. **Sección "Not a chatbot"** → renombrar y reescribir para el nuevo mensaje
6. **Aha moment** — cambiar el chat simulado para mostrar el journey de fases
7. **Comparación** — columnas actualizadas ("Solo Claude Code" vs CC Creator)
8. **Features cards** — actualizar "Controla tus proyectos" y "Acciones rápidas"
9. **Precio** — agregar benefits del sistema de fases

### NICE TO HAVE

10. **CTA texts** — actualizar todos los botones
11. **FAQ** — agregar "¿Qué es una App Directa?" y "¿Qué son las 6 fases?"
12. **Footer tagline** — "De la idea a la App Directa · Open Source · MIT"

---

## README GitHub — Plan de reescritura

El README actual tiene estos problemas:
- Título: "CC Controller — Remote Claude Code Bridge" (desactualizado)
- Descripción: solo el bridge, nada del sistema de 6 fases
- Arquitectura: no incluye claude-md.js, PhasePanel, SecretsSheet
- Instalación: sección de DMG mencionada cuando Homebrew es lo recomendado

### Nuevo README — Estructura

```markdown
# CC Creator

De la idea a tu App Directa, guiado por Claude.

[screenshot mu_2_ccc.png]

CC Creator es una App Directa + app de escritorio que convierte Claude Code
en un asistente guiado para crear aplicaciones desde el móvil.

El proceso: 6 fases desde Ideación hasta Validación. Claude tiene las instrucciones
correctas en cada etapa via CLAUDE.md automático por proyecto.

## Sistema de 6 Fases

| Fase | Nombre | Claude hace |
|------|--------|-------------|
| 1 | Ideación | Escucha la idea, elige el stack, explica Local First |
| 2 | POC Local | Construye con web previewer en tiempo real |
| 3 | Lanzamiento | GitHub repo + Netlify deploy |
| 4 | Backend | Supabase: BD, auth, storage |
| 5 | App Directa Completa | Manifest, service worker, optimización |
| 6 | Validación | Certifica en kitifica.com/validador/ |

## Instalación rápida

brew install --cask kitifica-max/tap/cc-controller

Luego abre ccc.kitifica.com desde tu iPhone.

## Arquitectura

[tabla actualizada con claude-md.js, PhasePanel, SecretsSheet, bridge de fases]

## Requisitos

[igual al actual]

## Desarrollo local

[igual al actual]

## Seguridad

[igual al actual — es bueno]

## Licencia

MIT
```

---

## Concepto "App Directa" — Cómo introducirlo

En la landing, agregar una micro-explicación en la sección de 6 fases o en el FAQ:

```
¿Qué es una App Directa?
El concepto de Kitifica para las Progressive Web Apps: aplicaciones web que se
instalan desde el navegador, funcionan offline y se comportan como apps nativas.
Sin App Store. Sin revisión. Lanzas hoy.
```

Esto educa al usuario que no conoce el término sin interrumpir el flujo principal.
