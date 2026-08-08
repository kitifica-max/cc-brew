# CC Controller — Projects, Settings & File Upload Design

## Goal

Evolve CC Controller from a single-session chat bridge into a multi-project workspace: each project maps to a real directory on the Mac, has its own Claude model + effort settings, supports file upload from iPhone, and can be opened directly in Claude Code Desktop.

## Architecture — Electron-first

The Mac (Electron) is the source of truth for projects. The PWA is a remote control.

```
Mac (Electron)                         iPhone (PWA)
──────────────────────────────         ──────────────────────────
~/.config/cc-controller/               localStorage
  projects.json                          → project list + messages
                                         → active project id
~/CCProjects/
  mi-app/            ← cwd for claude
  landing-page/
  api-backend/

Supabase Storage (transit only)
  uploads/{sessionId}/{filename}       → Electron downloads → deletes
```

**Key principle:** all paths validated server-side on Electron. Supabase Storage files deleted immediately after download. Every PWA→Electron event requires `SESSION_TOKEN`.

## Data Models

### Project (localStorage, PWA)
```js
{
  id: string,                  // random slug
  name: string,                // "Mi App"
  path: string | null,         // null until Electron confirms creation
  model: string,               // default: 'claude-sonnet-4-6'
  effort: 'high' | 'medium' | 'low',   // default: 'medium'
  createdAt: number,
  messages: Message[],
  isNewStart: boolean,
}
```

### projects.json (Electron, ~/.config/cc-controller/)
```json
{
  "projects": [
    { "id": "abc123", "name": "mi-app", "path": "/Users/daniel/CCProjects/mi-app", "createdAt": 1723000000 }
  ],
  "activeId": "abc123"
}
```

### Message
```js
{ id: string, role: 'user' | 'claude' | 'system', text: string, time: string }
```

## Supabase Events

### PWA → Electron (all require `token: SESSION_TOKEN`)

| Event | Payload | Description |
|---|---|---|
| `input` | `{text, token, continue, model, effort}` | Send message (adds model/effort) |
| `create-project` | `{token, id, name}` | Create directory + register project |
| `switch-project` | `{token, id}` | Change active project |
| `upload-file` | `{token, storageKey, filename, projectId}` | Download file to project dir |
| `open-claude-desktop` | `{token, projectId}` | Open Claude Desktop app |

### Electron → PWA

| Event | Payload | Description |
|---|---|---|
| `message` | `{role, text, ts}` | Claude response |
| `project-state` | `{projects: [...], activeId}` | Broadcast on connect + on change |

## Security

- **All events:** `token !== SESSION_TOKEN` → reject silently
- **`create-project`:** sanitize name (`/[^a-zA-Z0-9 _-]/g → ''`), slug it, resolve to `~/CCProjects/{slug}` only, reject if path escapes that directory
- **`switch-project`:** validate `id` exists in `projects.json` before changing cwd
- **`upload-file`:** whitelist extensions (`.png .jpg .jpeg .gif .pdf .txt .md .json .csv .svg .zip`), max 10MB, write only to active project dir, delete from Supabase Storage after download
- **`open-claude-desktop`:** validate `projectId` in `projects.json` before opening
- **Supabase Storage:** anon key can upload to `uploads/` bucket only; RLS blocks reads from other sessions

## Flows

### ① Create Project
1. User enters name in PWA → taps "Crear"
2. PWA adds project to localStorage (`path: null`, pending state)
3. PWA sends `create-project {token, id, name}`
4. Electron: sanitize name → slug → `mkdir ~/CCProjects/{slug}` → write to projects.json → set as activeId
5. Electron broadcasts `project-state` with full list + real paths
6. PWA updates project with confirmed path, sets as current

### ② Switch Project
1. User taps project in list
2. PWA updates currentId locally
3. PWA sends `switch-project {token, id}`
4. Electron validates id in projects.json → updates activeId → updates cwd for next claude call

### ③ Upload File
1. User taps 📎 → native file picker
2. PWA uploads to Supabase Storage: `uploads/{sessionId}/{timestamp}-{filename}`
3. PWA sends `upload-file {token, storageKey, filename, projectId}`
4. Electron: validate projectId → download from Storage → write to `projectDir/{filename}` → delete from Storage
5. Electron broadcasts `message {role: 'system', text: 'Archivo guardado: {filename}'}`

### ④ Open in Claude Desktop
1. User taps "Abrir en Claude Desktop" in settings sheet
2. PWA sends `open-claude-desktop {token, projectId}`
3. Electron validates projectId in projects.json
4. Electron: `open -a "Claude" {project.path}`

### ⑤ Model / Effort
1. User changes in settings sheet → saved to localStorage immediately
2. On next message send: payload includes `{model, effort}`
3. Bridge passes to `pty.write(text, continueConv, model, effort)`
4. pty builds args: `['--print', '--continue', '--model', model, '--effort', effort]`

## UI

### Projects List View
- Header: "Proyectos" + back button
- Cards: project name, model, date, message count
- Active project: orange card
- ✕ to delete (with confirmation if has messages)
- Bottom: "Crear proyecto" button → name input → sends create-project event

### Chat View (updated header)
- Header tap → opens Settings Sheet
- Shows project name (not "Session MAIN")
- Shows model pill: e.g. "sonnet-4.6"
- Input bar: SVG paperclip icon (Iconifika) on left, text input, send button (SVG arrow icon)
- No emojis anywhere — all icons are inline SVGs fetched from Iconifika

### Settings Sheet (bottom drawer)
- Project name + path
- **Modelo:** radio — Opus 5 / Opus 4.6 / Sonnet 5 / Sonnet 4.6 (default) / Haiku 4.5
- **Effort:** segmented — high / medium (default) / low
- **[Abrir en Claude Desktop]** button
- Close button

### Electron Tray (updated)
- Shows active project name instead of SESSION_ID
- New menu item: active project path (dimmed, non-clickable)

## Available Models
```
claude-opus-5
claude-opus-4-6
claude-sonnet-5
claude-sonnet-4-6    ← default
claude-haiku-4-5
```

## Out of Scope
- Usage limits / context window display (separate spec)
- Multi-conversation per project
- Real-time file sync / watch
- Cloud backup of projects
