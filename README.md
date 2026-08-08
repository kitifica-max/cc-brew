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

### 1.3 Política RLS para uploads desde la PWA

La PWA (anon key) necesita permiso para subir archivos. Ve a **SQL Editor** y ejecuta:

```sql
CREATE POLICY "anon_insert_uploads" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'uploads');
```

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
NEXT_PUBLIC_SESSION_TOKEN="un-token-secreto-largo-y-aleatorio"
```

> **Seguridad:** `SESSION_TOKEN` es la única barrera entre el canal de Supabase y tu Mac. Usa al menos 32 caracteres aleatorios. Genera uno con:
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
4. En **Site configuration → Environment variables**, agrega las 4 variables de `.env.local`
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

> **Importante:** `SESSION_ID` y `SESSION_TOKEN` deben ser exactamente iguales en Desktop y PWA.

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
4. Escribe mensajes — Claude Code responde en tiempo real

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
| `SESSION_TOKEN` | Cada evento PWA→Electron requiere este token. Sin él, el evento se ignora silenciosamente. |
| Path traversal | Electron valida que todos los archivos y proyectos queden dentro de `~/CCProjects/`. |
| Storage temporal | Los archivos subidos se eliminan de Supabase inmediatamente después de descargarse. |
| `.env` permisos | Los archivos de secretos se crean con `mode 0o600`. |
| Llave de servicio | `SUPABASE_SERVICE_KEY` solo existe en `desktop/.env`, nunca en el frontend. |

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
│   │   │   ├── SettingsSheet.js   # Modelo, effort, secretos
│   │   │   ├── ProjectsList.js    # Lista y gestión de proyectos
│   │   │   └── FileUpload.js      # Subida de archivos
│   │   └── lib/
│   │       ├── supabase.js        # Cliente Supabase
│   │       └── storage.js         # localStorage helpers
│   └── .env.local.example    # Template de variables
│
└── scripts/
    └── setup-storage-policy.sql   # Política RLS para uploads
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
→ La política RLS de Supabase Storage no está configurada. Ejecuta el SQL del Paso 1.3.

---

## Licencia

Boilerplate comercial. Puedes modificarlo y usarlo en proyectos propios o de clientes. No redistribuir como producto independiente.
