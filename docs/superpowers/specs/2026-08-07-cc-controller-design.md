# CC Controller — Design Spec
**Date:** 2026-08-07  
**Status:** Approved

## Objetivo

Monitorear e interactuar con una sesión local de Claude Code desde un teléfono móvil, en tiempo real, sin herramientas premium de control remoto.

## Arquitectura

```
[Mac: wrapper/]                [Supabase Realtime]           [Netlify: web/]
  node-pty                         Broadcast channel             Next.js PWA
  └─ claude process    →  session:{id} / event:output  →   terminal display
  └─ stdin inject      ←  session:{id} / event:input   ←   botones + input
```

## Estructura de Monorepo

```
cc-controller/
├── wrapper/
│   ├── package.json
│   ├── index.js          # pty + supabase bridge
│   └── .env.example
├── web/
│   ├── package.json
│   ├── next.config.js
│   ├── netlify.toml
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── app/
│       ├── layout.js
│       ├── page.js       # terminal UI
│       └── globals.css
├── package.json          # workspace root
└── .env.example
```

## Componentes

### 1. Wrapper (Node.js local)

- `node-pty` spawn de `claude` con PTY
- `@supabase/supabase-js` para Realtime
- Broadcast `output` → cada chunk de stdout/stderr
- Suscripción a `input` → inyecta en `pty.write()`
- Validación de token estático en eventos `input` entrantes
- Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SESSION_TOKEN`, `SESSION_ID`

### 2. Canal Supabase Realtime

- Tipo: **Broadcast** (efímero, sin persistencia DB)
- Canal: `session:{SESSION_ID}`
- Eventos:
  - `output` → `{text: string, ts: number}` (wrapper → móvil)
  - `input` → `{text: string, token: string}` (móvil → wrapper)
- Sin tablas, sin RLS. Anon key en cliente PWA.

### 3. PWA (Next.js → Netlify)

- App Router, mobile-first
- Suscripción Supabase Realtime → renderiza chunks en `<pre>` scrollable
- Input libre + botones rápidos: `y`, `n`, `Ctrl+C`, `Enter`
- Token estático incluido en cada evento `input`
- `public/manifest.json` → instalable como PWA
- `public/sw.js` → service worker mínimo para PWA compliance

## Auth

Token estático (`SESSION_TOKEN`) en `.env`:
- Wrapper: rechaza eventos `input` donde `payload.token !== SESSION_TOKEN`
- PWA: envía token hardcodeado en variable de entorno pública de Netlify (`NEXT_PUBLIC_SESSION_TOKEN`)

## Flujo de datos

1. `node wrapper/index.js` en Mac
2. Wrapper lanza `claude` en pty, conecta canal Supabase
3. Output del proceso → broadcast `output`
4. PWA (Netlify) suscrita → acumula texto en buffer, renderiza
5. Usuario toca botón/escribe → broadcast `input` con token
6. Wrapper valida token → `pty.write(text)`

## Decisiones clave

- Broadcast sin DB: latencia mínima, costo cero en writes
- Service key en wrapper (server-side): no expuesta en cliente
- Anon key en PWA: solo puede hacer broadcast, no accede a datos
- Monorepo: un solo repo, deploy independiente wrapper (local) y web (Netlify)

## Diseño visual aprobado

**Estilo:** Bold moderno (referencia Dribbble colorful UI)
**Font:** Sora (Google Fonts) — 700/800 para títulos, 600 para labels
**Paleta:**
- Fondo: `#fde8e4` (rosa cream)
- Hero tray: `#1a1a1a` (negro)
- Acento primario: `#f04e23` (naranja — header PWA, botón stop, approval)
- Acento éxito: `#00b09b` (teal — status running, connected)
- Acento alerta: `#f5c518` (amarillo — badge uptime)
- Blanco: `#ffffff` (cards)

**Mac Tray (dropdown):**
- Card blanca, 24px border-radius
- Hero negro con session ID grande (800) y badge de uptime amarillo
- Status pill teal
- Stats rows limpios
- Botones Stop (naranja) / Restart (gris claro)
- Footer con URL de la PWA

**PWA Móvil:**
- Fondo rosa cream, border negro 6px (phone frame)
- Header naranja con nombre de sesión extrabold
- Card blanca con terminal output (live, monospace)
- Approval card con borde naranja + botones Approve (negro) / Reject (naranja claro)
- Quick chips: Ctrl+C, Enter
- Input bar blanca con botón send naranja circular

## Fuera de scope

- Múltiples sesiones simultáneas
- Historial persistente de sesiones
- Autenticación multi-usuario
