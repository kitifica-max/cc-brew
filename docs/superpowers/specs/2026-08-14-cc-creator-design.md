# CC Creator — Diseño Arquitectural
**Fecha:** 2026-08-14
**Estado:** Aprobado por Daniel Pineda

---

## Resumen ejecutivo

CC Creator (renombre de CC Controller) es una App Directa + app de escritorio que convierte a Claude Code en un asistente guiado para crear aplicaciones App Directa completas desde el móvil. El producto adopta la filosofía **Kitifica Local First**: construir un POC funcional primero, validarlo, y escalar progresivamente con las herramientas correctas (GitHub, Netlify, Supabase).

Claude opera con skills inyectadas automáticamente (ui-ux-pro-max, superpowers) via `CLAUDE.md` por proyecto. El flujo es guiado por Claude en el chat de manera natural, no por wizards rígidos.

---

## Enfoque arquitectural: A + C

- **A (CLAUDE.md por proyecto):** CC Creator escribe un `CLAUDE.md` en la carpeta del proyecto con filosofía, fase actual e instrucciones de skills. Claude Code lo lee nativamente.
- **C (Mensaje de arranque):** En proyectos nuevos, CC Creator envía un mensaje inicial automático para que Claude inicie la conversación guiada presentando el proceso completo.

---

## Sistema de fases

Cada proyecto avanza por 6 fases secuenciales. El usuario controla el avance manualmente. CC Creator no salta fases automáticamente.

| Fase | Nombre | Claude hace |
|------|--------|-------------|
| 1 | **Ideación** | Presenta el proceso de 6 fases, escucha la idea, elige el stack, explica Local First |
| 2 | **POC Local** | Construye la app localmente, usa web previewer para testear en tiempo real |
| 3 | **Lanzamiento** | Guía creación de repo GitHub + deploy en Netlify usando los tokens del usuario |
| 4 | **Backend** | Conecta Supabase: base de datos, auth, storage |
| 5 | **App Directa Completa** | Secrets avanzados, APIs, manifest, service worker, optimización |
| 6 | **Validación** | Abre `kitifica.com/validador/` con la URL del proyecto para certificar la App Directa |

### Reglas de avance
- Solo avance secuencial (1→2→3…)
- El usuario toca "Avanzar a fase X" cuando está listo
- Se puede retroceder con confirmación
- Al avanzar: CC Creator reescribe `CLAUDE.md` + envía mensaje de transición al chat

---

## CLAUDE.md — Estructura por fase

CC Creator escribe este archivo en la raíz del proyecto al asignar una carpeta. Se actualiza al cambiar de fase.

```markdown
# CC Creator — [nombre del proyecto]
## Fase actual: [N] · [Nombre]
**Stack:** [elegido en fase 1]

### Filosofía Kitifica Local First
Construir primero un POC funcional local, validar la idea con usuarios
reales, escalar progresivamente. No sobre-ingenierizar antes de validar.

### Tu rol en esta fase
[instrucciones específicas de la fase — ver detalle abajo]

### Skills activos
[reglas condensadas de ui-ux-pro-max relevantes a la fase]
[reglas de superpowers relevantes a la fase]

### Contexto del proyecto
- GitHub: [URL cuando esté configurado]
- Netlify: [URL cuando esté configurado]
- Supabase: [proyecto cuando esté configurado]
```

#### Instrucciones por fase

**Fase 1 — Ideación:**
- Presentar el proceso completo de 6 fases al usuario antes de cualquier pregunta
- Explicar qué es Local First y por qué funciona
- Preguntar qué quiere construir (una sola pregunta, escuchar)
- Elegir el stack más adecuado y justificarlo claramente
- No empezar a codear hasta tener claridad total de la idea y aprobación del usuario

**Fase 2 — POC Local:**
- Construir iterativamente, mostrar progreso frecuente
- Usar el web previewer de CC Creator para que el usuario vea el avance en tiempo real
- Priorizar funcionalidad core sobre diseño perfecto
- Aplicar reglas de ui-ux-pro-max desde el inicio

**Fase 3 — Lanzamiento:**
- Guiar al usuario para obtener GITHUB_TOKEN (instrucciones paso a paso en chat)
- Crear el repo, hacer el primer push
- Guiar para obtener NETLIFY_TOKEN, conectar y hacer primer deploy
- Confirmar que la URL pública funciona antes de continuar

**Fase 4 — Backend:**
- Guiar para obtener credenciales de Supabase
- Implementar schema de base de datos según necesidades del POC
- Conectar auth si el proyecto lo requiere
- Migrar datos locales del POC al backend

**Fase 5 — App Directa Completa:**
- Implementar manifest.json y service worker correctamente
- Configurar secrets de producción
- Optimizar performance y accesibilidad
- Preparar para validación Kitifica

**Fase 6 — Validación:**
- Revisar checklist App Directa completo
- Abrir kitifica.com/validador/ con la URL del proyecto
- Corregir issues encontrados por el validador
- Celebrar el lanzamiento

---

## Mensaje de arranque (Enfoque C)

Solo se envía cuando `project.isNew === true`. CC Creator lo manda automáticamente al conectar y establece `isNew: false`.

```
Nuevo proyecto creado en CC Creator. Por favor:
1. Saluda al usuario y preséntate como su asistente de desarrollo
2. Explica el proceso de 6 fases de CC Creator y la filosofía Local First de Kitifica
3. Pregunta qué quiere construir
No empieces a codear todavía.
```

---

## Indicador de fases en la App Directa

**Header del chat:** pill no intrusivo junto a las donas de consumo:
```
[Fase 2 · POC Local ▸]
```

**Al tocar el pill** → panel lateral con:
- 6 fases listadas verticalmente
- Fase actual resaltada en naranja
- Fases completadas con ✓ verde
- Fases futuras en gris
- Descripción breve de cada fase
- Botón "Avanzar a Fase X" (solo hacia adelante)
- Opción de retroceder con confirmación

---

## Secrets / Variables de entorno — Rediseño

Claude guía la obtención de cada token en el chat. La interfaz de secrets en CC Creator solo recibe, organiza y confirma los valores. Claude es el tutor, la UI es el vault.

**Categorías predefinidas:**

| Categoría | Variables |
|-----------|-----------|
| GitHub | `GITHUB_TOKEN` |
| Netlify | `NETLIFY_TOKEN`, `NETLIFY_SITE_ID` |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` |
| Custom | cualquier `KEY=VALUE` |

**Por variable:**
- Nombre fijo visible (no editable en predefinidas)
- Campo de valor para pegar el token
- Ícono `?` con instrucciones breves de dónde conseguirlo (complemento al chat)
- Indicador de estado: vacío / configurado ✓

**Visibilidad por fase:** solo se muestran las variables relevantes a la fase actual. Supabase no aparece hasta fase 4.

---

## Modelo de datos — Proyecto

```js
{
  // campos existentes
  id, name, path, model, effort, skipPermissions, spendLimit,
  createdAt, messages,

  // campos nuevos
  phase: 1,              // número de fase actual (1-6)
  stack: null,           // string — elegido por Claude en fase 1
  isNew: true,           // true = enviar mensaje de arranque al conectar
  githubRepo: null,      // URL del repositorio GitHub
  netlifyUrl: null,      // URL del deploy en Netlify
  supabaseProject: null, // ID del proyecto en Supabase
}
```

---

## Skills inyectadas en CLAUDE.md

### ui-ux-pro-max (condensado por fase)
- Fase 1-2: reglas de touch targets, contraste, tipografía, layout responsive
- Fase 5: checklist completo de accesibilidad, performance, App Directa

### superpowers (condensado por fase)
- Todas las fases: systematic-debugging, no fixes sin root cause
- Fase 2-3: TDD básico para features core
- Fase 5: verification-before-completion antes de declarar terminado

---

## Renombre: CC Controller → CC Creator

Archivos a actualizar:
- `desktop/package.json` — name, productName
- `desktop/electron-builder.yml` — appId, productName
- `web/app/layout.js` — title, meta
- `web/public/landing/index.html` — todos los textos
- `desktop/src/main.js` — textos del tray menu
- Homebrew tap formula — name y cask
- README.md

---

## Integraciones de herramientas externas

| Herramienta | Cómo se usa | Fase |
|-------------|-------------|------|
| **Web Previewer** | cloudflared tunnel ya implementado — Claude arranca servidor, usuario ve la app en móvil | 2 |
| **GitHub** | Claude crea repo via CLI usando GITHUB_TOKEN del env | 3 |
| **Netlify** | Claude usa Netlify CLI con NETLIFY_TOKEN para deploy | 3 |
| **Supabase** | Claude usa Supabase CLI con las credenciales del env | 4 |
| **Kitifica Validador** | CC Creator abre `kitifica.com/validador/` en fase 6 | 6 |

---

## Lo que NO cambia

- Arquitectura Supabase Realtime (canal privado App Directa ↔ desktop)
- node-pty para spawn de Claude CLI
- Sistema de donas de consumo
- Sistema de permisos / skipPermissions
- Web previewer (cloudflared) ya implementado
- Autenticación existente

---

## Orden de implementación sugerido

1. Renombre CC Controller → CC Creator
2. Nuevo campo `phase` en modelo de proyecto + UI del indicador de fases
3. Generación de `CLAUDE.md` al asignar carpeta + al cambiar fase
4. Mensaje de arranque automático (`isNew`)
5. Rediseño de secrets por categorías
6. Condensar skills en templates de `CLAUDE.md` por fase
7. Integración Kitifica Validador en fase 6
