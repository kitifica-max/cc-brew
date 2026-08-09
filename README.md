<p align="center">
  <img src="logos/logoccc2.svg" alt="CC Controller" width="160"/>
</p>

# CC Controller — Remote Claude Code Bridge

Control Claude Code desde tu iPhone (o cualquier móvil) usando una PWA como control remoto. El Mac ejecuta Claude Code localmente; el teléfono envía y recibe mensajes en tiempo real vía Supabase Realtime.

```
iPhone (PWA)  ──── Supabase Realtime ────  Mac (Electron)
  Escribe prompt                              claude --print
  Ve la respuesta          ◄──────           Transmite output
  Sube archivos            ──────►           Guarda en ~/CCProjects/
```

## Arquitectura

| Componente | Tecnología | Rol |
|---|---|---|
| **Desktop** | Electron 30 + Node.js | Ejecuta `claude --print` localmente, gestiona proyectos |
| **PWA** | Next.js 14 + Netlify | Control remoto desde el móvil |
| **Bridge** | Supabase Realtime (Broadcast) | Canal WebSocket entre ambos extremos |
| **Storage** | Supabase Storage (`uploads`) | Tránsito temporal de archivos |

---

## Requisitos Previos

- **Mac** con [Claude Code](https://claude.ai/code) instalado y configurado (`claude` en PATH)
- **Node.js** ≥ 18
- Cuenta en [Supabase](https://supabase.com) (plan gratuito suficiente)
- Cuenta en [Netlify](https://netlify.com) (plan gratuito suficiente)

---

## Paso 1 — Supabase (Backend)

### 1.1 Crear proyecto

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elige región cercana a tu Mac
3. Anota la contraseña de base de datos (no la necesitarás, pero guárdala)

### 1.2 Bucket de Storage

1. En el sidebar: **Storage** → **New bucket**
2. Nombre: `uploads`
3. **Public bucket**: OFF (privado)
4. Crea el bucket

### 1.3 Autenticación y políticas

CC Controller exige que quien abra la PWA inicie sesión: el canal de Supabase
da control total sobre tu Mac, así que no puede quedar abierto al público.

1. **Authentication → Providers → Email**: activa el proveedor. Basta con
   *Magic Link* / OTP (sin contraseña).
2. **SQL Editor**: ejecuta [`scripts/setup-supabase.sql`](scripts/setup-supabase.sql).
   Crea la tabla `public.cc_allowed_users`, la función `public.cc_can_access()`,
   las políticas de Realtime Authorization para canales privados y las de
   Storage restringidas a usuarios autorizados.
3. **Realtime → Settings**: activa *Realtime Authorization* (canales privados).
4. Autoriza tu propio usuario (después de tu primer login) con la consulta que
   viene comentada al final del script:

```sql
INSERT INTO public.cc_allowed_users (user_id, session_id)
SELECT id, 'cc-session-01' FROM auth.users WHERE email = 'tu@correo.com'
ON CONFLICT (user_id) DO UPDATE SET session_id = EXCLUDED.session_id, active = true;
```

Las columnas `active` y `expires_at` permiten revocar el acceso sin borrar la
cuenta.

### 1.4 Obtener las llaves

Ve a **Project Settings → API**:

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | `anon` / `public` |
| `SUPABASE_SERVICE_KEY` | `service_role` (nunca expongas esta llave) |

---

## Paso 2 — PWA (Web / Next.js)

### 2.1 Instalar dependencias

```bash
cd web
npm install
```

### 2.2 Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
NEXT_PUBLIC_SESSION_ID="cc-session-01"
```

> **Seguridad:** el `SESSION_TOKEN` **no** se configura aquí. Cualquier variable
> `NEXT_PUBLIC_*` termina en el JavaScript que sirve Netlify, y un token público
> equivale a dar ejecución remota en tu Mac a quien encuentre la URL. La PWA lo
> pide una sola vez tras iniciar sesión y lo guarda en el navegador del
> dispositivo. Genera el token con:
> ```bash
> openssl rand -hex 32
> ```

### 2.3 Correr en desarrollo

```bash
npm run dev
# Abre http://localhost:3000
```

### 2.4 Desplegar en Netlify

1. Haz fork/push del repo a tu GitHub
2. En Netlify: **Add new site → Import from Git**
3. Build settings:
   - **Base directory:** `web`
   - **Build command:** `npm run build`
   - **Publish directory:** `web/.next`
4. En **Site configuration → Environment variables**, agrega las 3 variables de `.env.local`
   (nunca el `SESSION_TOKEN`)
5. Redeploy

---

## Paso 3 — Desktop (Electron / Mac)

### 3.1 Instalar dependencias

```bash
cd desktop
npm install
```

### 3.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `desktop/.env`:

```env
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_KEY="tu-service-role-key"
SESSION_ID="cc-session-01"
SESSION_TOKEN="un-token-secreto-largo-y-aleatorio"
PWA_URL="tu-app.netlify.app"
```

> **Importante:** el `SESSION_ID` debe coincidir con `NEXT_PUBLIC_SESSION_ID` de la
> PWA, y el `SESSION_TOKEN` es el que introducirás a mano en la PWA la primera vez.

### 3.3 Correr en desarrollo

```bash
npm run dev
```

Aparecerá un ícono en el tray (barra superior del Mac). Clic derecho → **Iniciar**.

### 3.4 Construir el ejecutable

```bash
npm run build
```

Genera en `desktop/dist/`:
- `CC Controller-1.0.0-arm64.dmg` → Apple Silicon
- `CC Controller-1.0.0.dmg` → Intel

Instala el DMG arrastrando a Applications. Al abrir, CC Controller vive en el tray sin ícono en el Dock.

---

## Uso Diario

### Flujo normal

1. Abre CC Controller desde Applications (queda en el tray)
2. Clic derecho → **Iniciar sesión**
3. Abre la PWA en tu iPhone (agrégala a la pantalla de inicio para usarla como app nativa)
4. La primera vez: inicia sesión con tu correo (recibes un enlace/código) y pega
   el `SESSION_TOKEN` de `~/.config/cc-controller/.env`. Queda guardado en el
   dispositivo.
5. Escribe mensajes — Claude Code responde cuando termina de procesar el prompt
   (`claude --print` no transmite token a token).

### Proyectos

- Toca el nombre del proyecto en el header → abre la lista de proyectos
- **Nuevo proyecto:** CC Controller crea `~/CCProjects/<slug>/` en el Mac
- Claude Code siempre corre dentro del directorio del proyecto activo

### Variables de entorno (.env)

Desde la PWA: **ícono de ajustes → Entorno / Secretos**. Las claves que ingreses se transmiten una sola vez por Supabase Realtime y se guardan exclusivamente en:

```
~/CCProjects/<proyecto>/.env
```

con permisos `600` (solo el usuario propietario puede leerlas). **Nunca se almacenan en la PWA ni en Supabase.**

### Subir archivos desde iPhone

Toca el ícono de clip en la barra de entrada. El archivo se sube a Supabase Storage temporalmente, Electron lo descarga al directorio del proyecto y lo elimina de Storage de inmediato.

Formatos permitidos: `.png .jpg .jpeg .gif .pdf .txt .md .json .csv .svg .zip` (máx. 10 MB)

---

## Seguridad

| Medida | Descripción |
|---|---|
| Supabase Auth | La PWA no funciona sin iniciar sesión; solo los usuarios de `cc_allowed_users` (con `active = true` y sin expirar) pasan. |
| Canal privado | El canal `session:<id>` usa Realtime Authorization: sin un JWT autorizado no se puede leer ni escribir en el Broadcast. |
| `SESSION_TOKEN` | Segunda barrera: cada evento PWA→Electron lo requiere. Ya no se compila en el bundle; se introduce en el dispositivo. |
| Path traversal | Electron valida que todos los archivos y proyectos queden dentro de `~/CCProjects/`. |
| Storage temporal | Los archivos subidos se eliminan de Supabase inmediatamente después de descargarse. |
| `.env` permisos | Los archivos de secretos se crean con `mode 0o600`. |
| Llave de servicio | `SUPABASE_SERVICE_KEY` solo existe en la config del desktop, nunca en el frontend. |
| Storage con RLS | Subir y leer en `uploads` requiere sesión autenticada y autorizada para ese `session_id`. |

> El `SESSION_TOKEN` guardado en el navegador es un secreto compartido: si
> pierdes el teléfono, rota el token en `~/.config/cc-controller/.env` y
> reinicia el desktop.

---

## Mantener el Mac Despierto

Claude Code necesita que el Mac esté activo para responder. Si el Mac se duerme, el WebSocket de Electron se cae.

**Opciones:**
- **[Amphetamine](https://apps.apple.com/us/app/amphetamine/id937984704)** (gratis, Mac App Store) — mantiene el Mac despierto mientras CC Controller corre
- `caffeinate -d` en terminal — evita el modo de espera de pantalla
- Configurar **System Settings → Lock Screen → Turn display off** a "Never" mientras trabajes remotamente

---

## Estructura del Repositorio

```
cc-controller/
├── desktop/                  # Electron (Mac)
│   ├── src/
│   │   ├── main.js           # Entry point, tray, event wiring
│   │   ├── bridge.js         # Supabase Realtime bridge
│   │   ├── pty.js            # claude --print runner
│   │   └── projects.js       # ProjectManager (~/.config + ~/CCProjects)
│   ├── .env.example          # Template de variables
│   └── electron-builder.yml  # Config para generar DMG
│
├── web/                      # Next.js PWA
│   ├── app/
│   │   ├── page.js           # Chat UI principal
│   │   ├── components/
│   │   │   ├── AuthGate.js        # Login Supabase + emparejamiento del token
│   │   │   ├── SettingsSheet.js   # Modelo, effort, secretos
│   │   │   ├── ProjectsList.js    # Lista y gestión de proyectos
│   │   │   └── FileUpload.js      # Subida de archivos
│   │   └── lib/
│   │       ├── supabase.js        # Cliente Supabase
│   │       └── storage.js         # localStorage helpers
│   └── .env.local.example    # Template de variables
│
└── scripts/
    └── setup-supabase.sql    # Auth, Realtime Authorization y RLS de Storage
```

---

## Solución de Problemas

**"Desktop detenido" en la PWA aunque Electron corra**
→ Electron envía heartbeat cada 20s. Si la PWA no recibe uno en 45s, marca el desktop como detenido. Verifica que Electron tenga sesión iniciada (clic derecho en tray → Iniciar).

**"Project not found" al cambiar de proyecto**
→ Ocurre si el `projects.json` de Electron no tiene el proyecto del PWA. La PWA reenvía automáticamente `create-project` cuando el proyecto no tiene path confirmado.

**La respuesta de Claude tiene caracteres extraños (`[0m`, `[31m`)**
→ Caracteres ANSI. El bridge los filtra automáticamente. Si persisten, asegúrate de tener la versión más reciente del DMG.

**La subida de archivos falla con error 403**
→ Falta ejecutar `scripts/setup-supabase.sql` o tu usuario no está en
`cc_allowed_users` con el `session_id` correcto.

**La PWA se queda en "Conectando" o el canal no suscribe**
→ Realtime Authorization está activo pero tu usuario no está autorizado.
Revisa `cc_allowed_users` (`active`, `expires_at`, `session_id`).

**Electron no acepta mis mensajes**
→ El token guardado en el dispositivo no coincide con el `SESSION_TOKEN` del
Mac. Borra los datos del sitio en el navegador y vuelve a emparejar.

**DMG sin firmar: "no se puede abrir porque proviene de un desarrollador no identificado"**
→ El build no está firmado ni notarizado. Ábrelo con clic derecho → *Abrir*, o
firma tú mismo poniendo `notarize: true` en `desktop/electron-builder.yml` con
un certificado *Developer ID Application* y las variables `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` y `APPLE_TEAM_ID`.

---

## Licencia

[MIT](LICENSE) — úsalo, modifícalo y redistribúyelo libremente.
