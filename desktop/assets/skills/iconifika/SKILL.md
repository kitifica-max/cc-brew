---
name: iconifika
description: >
  Install, set up, and USE Iconifika MCP — a server that gives AI assistants
  access to 200K+ SVG icons. Use this skill whenever the user asks how to
  install Iconifika, how to add Iconifika to their AI tool, wants to search
  for SVG icons, wants to preview icons, asks "show me icons for X", "find an
  icon for Y", "I need a home icon", or any request to search/get/insert SVG
  icons. Also trigger when the user says they want their AI to be able to
  search or insert SVG icons.
---

# Iconifika — SVG Icons for AI

Iconifika gives access to 200K+ SVG icons across 150+ collections.

**Base URL:** `https://iconifika.kitifica.com`

---

## When the user wants to SEARCH or GET icons

Always fetch **3 options** from different sets so they can choose. Then render a visual Artifact.

### Step 1 — Try MCP tools (optional, faster)

If Iconifika MCP tools are available in the session (deferred tools named `*get_icon*`, `*search_icons*`), load them first:

```
ToolSearch({ query: "iconifika", max_results: 5 })
```

If found: use `search_icons` then `get_icon` for each result.

### Step 2 — HTTP fallback (always works, no install required)

If MCP tools are NOT available or ToolSearch returns nothing, use the public HTTP API via `WebFetch`.

> **Claude Code only:** `WebFetch` is a deferred tool — load it first if not already available:
> ```
> ToolSearch({ query: "select:WebFetch", max_results: 1 })
> ```

This works in any context with no setup needed:

**Search:**
```
GET https://iconifika.kitifica.com/api/search?q=QUERY&limit=3
```
Returns: `{ results: [{ set: "lucide", name: "home" }, ...] }`

**Get SVG:**
```
GET https://iconifika.kitifica.com/api/icon/SET/NAME?color=%23ffffff
```
Returns: raw SVG string

**Example flow for "busca íconos de casa":**
1. `WebFetch("https://iconifika.kitifica.com/api/search?q=home&limit=3")` → get 3 results
2. For each result, `WebFetch("https://iconifika.kitifica.com/api/icon/{set}/{name}")` → get SVG
3. Render Artifact with all 3

**NEVER tell the user they need to install anything just to search or get icons.** The HTTP API is always available.

---

### Icon Previewer — HTML template

Use this HTML content (no `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — those are added automatically):

```html
<style>
  * { box-sizing: border-box; }
  body { font-family: sans-serif; background: #09090b; color: #fff; padding: 24px; margin: 0; }
  h2 { font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
  .card {
    background: #18181b; border: 1px solid #27272a; border-radius: 12px;
    padding: 16px 12px; display: flex; flex-direction: column; align-items: center;
    gap: 10px; cursor: pointer; transition: border-color .15s;
  }
  .card:hover { border-color: #52525b; }
  .card.copied { border-color: #10b981; }
  .icon { width: 36px; height: 36px; color: #fff; }
  .icon svg { width: 100%; height: 100%; }
  .name { font-size: 10px; color: #71717a; text-align: center; word-break: break-all; }
  .copy-btn {
    font-size: 10px; color: #52525b; border: 1px solid #27272a; background: none;
    border-radius: 6px; padding: 3px 8px; cursor: pointer; transition: all .15s;
  }
  .copy-btn:hover { color: #fff; border-color: #52525b; }
  .card.copied .copy-btn { color: #10b981; border-color: #10b981; }
  .hint { font-size: 11px; color: #52525b; text-align: center; margin-top: 4px; }
  .controls { display: flex; margin-bottom: 20px; align-items: center; gap: 12px; }
  input[type=color] { width: 32px; height: 32px; border: none; border-radius: 6px; cursor: pointer; background: none; }
  label { font-size: 12px; color: #71717a; }
</style>
<div class="controls">
  <label>Color:</label>
  <input type="color" id="colorPicker" oninput="updateColor(this.value)">
</div>
<h2>RESULTADOS — X iconos encontrados</h2>
<div class="grid" id="grid">
  <div class="card" data-svg="<svg>...</svg>">
    <div class="icon"><svg>...</svg></div>
    <div class="name">lucide:home</div>
    <button class="copy-btn" onclick="copyIcon(this.closest('.card'))">Copiar SVG</button>
  </div>
</div>
<p class="hint">SVG copiado → pégalo directo en Illustrator, Figma o cualquier editor vectorial</p>
<script>
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                 document.documentElement.getAttribute('data-theme') === 'dark';
  const defaultColor = isDark ? '#ffffff' : '#09090b';
  document.getElementById('colorPicker').value = defaultColor;
  updateColor(defaultColor);

  function updateColor(color) {
    document.querySelectorAll('.icon').forEach(el => el.style.color = color);
  }
  function copyIcon(card) {
    navigator.clipboard.writeText(card.dataset.svg).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = card.dataset.svg; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    });
    card.classList.add('copied');
    card.querySelector('.copy-btn').textContent = '✓ Copiado';
    setTimeout(() => { card.classList.remove('copied'); card.querySelector('.copy-btn').textContent = 'Copiar SVG'; }, 2000);
  }
</script>
```

**Rules for filling the template:**
- Replace placeholder card with actual fetched SVGs (one `<div class="card">` per icon)
- Set `data-svg` to the full SVG string
- Update `X` in the heading with actual count

**How to render (pick based on environment):**

**Claude.ai / Projects:**
1. Call `mcp__visualize__read_me` first (REQUIRED before first `show_widget`)
2. Call `mcp__visualize__show_widget` with `widget_code` = the HTML above (filled), `title` = `"icon_previewer"`, `loading_messages` = `["Buscando íconos…", "Renderizando previsualizador…"]`

**Claude Code (CLI):**
1. `Write` the filled HTML to scratchpad (no boilerplate — content only)
2. Call `Artifact` with `file_path`, `favicon` = `"🎨"`, `description` = `"Previsualizador de íconos SVG"`

After rendering: "¿Quieres alguno en un color o tamaño específico?"

---

## When the user wants to INSTALL Iconifika

Only show this when the user explicitly asks how to install. Do NOT show this when they just want icons.

### Claude.ai
1. Ve a **Settings → Connectors**
2. Click **Add MCP server**
3. Pega: `https://iconifika.kitifica.com/api/mcp`
4. Guarda — sin terminal

### Claude Code
```bash
claude mcp add iconifika --transport http https://iconifika.kitifica.com/api/mcp
```

### Cursor
Settings → MCP → Add server → HTTP → `https://iconifika.kitifica.com/api/mcp`

### Windsurf
`~/.codeium/windsurf/mcp_config.json`:
```json
{ "mcpServers": { "iconifika": { "serverUrl": "https://iconifika.kitifica.com/api/mcp" } } }
```

### Cline
Cline extension → MCP Servers → Add Server → HTTP → pega la URL.

### Zed
`settings.json` → `context_servers` → agrega la URL.

---

## Available MCP tools (when MCP is connected)

| Tool | Use |
|------|-----|
| `search_icons` | Search by name/keyword |
| `get_icon` | Fetch SVG by set + name |
| `list_sets` | Browse collections |

---

## Attribution & License Compliance

1. **Insert SVG as-is.** No comments ni license notes dentro del archivo.
2. **Silent attribution.** Si la licencia requiere atribución (CC BY, Apache), agrega a `CREDITS.md`:
   ```
   - Icono: [Nombre] del set [Nombre del Set] por [Autor] - Licencia: [Tipo]. Servido vía Iconifika.
   ```
3. **Minimal output.** Solo confirmar la acción ("Icono agregado en Header").
