# Graph Report - /Users/daniel_elaniin/Documents/DP/CC Controller  (2026-08-08)

## Corpus Check
- Corpus is ~21,733 words - fits in a single context window. You may not need a graph.

## Summary
- 174 nodes · 235 edges · 17 communities (11 shown, 6 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Electron Bridge & Main
- Desktop Dependencies
- Brand & Architecture Docs
- PWA Components
- Bridge Class API
- Netlify & Build Tools
- Next.js & React
- Web Core Config
- PTY Process Manager
- PWA Manifest
- App Layout
- Test Suite
- Brand Favicons
- Next.js Config

## God Nodes (most connected - your core abstractions)
1. `Bridge` - 12 edges
2. `startSession()` - 10 edges
3. `PtyManager` - 9 edges
4. `load()` - 8 edges
5. `createProject()` - 7 edges
6. `buildMenu()` - 6 edges
7. `save()` - 6 edges
8. `getActive()` - 6 edges
9. `CC Controller v1 Design Spec (2026-08-07)` - 6 edges
10. `listProjects()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `CC Controller Mac Tray Icon — Orange Rounded Square with Interlocking Double-C Mark in White/Salmon` --semantically_similar_to--> `CC App Icon — Orange Background (#ff582a), White CC Mark, Rounded Square (accent surfaces, notifications)`  [INFERRED] [semantically similar]
  desktop/assets/tray-icon.png → logos/icon-app-orange.svg
- `PWA App Icon 512px — Orange Rounded Square, CC Double-C Mark (manifest icon large, maskable)` --semantically_similar_to--> `CC Controller Mac Tray Icon — Orange Rounded Square with Interlocking Double-C Mark in White/Salmon`  [INFERRED] [semantically similar]
  web/public/icon-512.png → desktop/assets/tray-icon.png
- `CC Controller README` --references--> `CC Controller Full Logo Dark — Dark Background, CC Mark + 'Controller' Wordmark in White (used in README header)`  [EXTRACTED]
  README.md → logos/logoccc2.svg
- `CC Controller README` --references--> `Static Session Token Auth — Single Security Layer for PWA-to-Electron Events`  [INFERRED]
  README.md → docs/superpowers/specs/2026-08-07-cc-controller-design.md
- `CC Controller README` --references--> `Supabase Broadcast Pattern — Ephemeral No-DB Realtime Channel (zero write cost, minimal latency)`  [INFERRED]
  README.md → docs/superpowers/specs/2026-08-07-cc-controller-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CC Controller Brand Identity System — All Assets Share Interlocking Double-C Mark** — logos_icon_mark_brand_mark, logos_fav_dark_favicon_dark, logos_fav1_favicon_light, logos_icon_app_cream_app_icon_cream, logos_icon_app_dark_app_icon_dark, logos_icon_app_orange_app_icon_orange, logos_icon1_logo_dark_wordmark, logos_logoccc1_logo_light_wordmark, logos_logoccc2_logo_dark_wordmark, desktop_assets_tray_icon_tray_icon, web_public_icon_192_pwa_icon_192, web_public_icon_512_pwa_icon_512 [INFERRED 0.95]
- **CC Controller Security Architecture — Token Auth + Broadcast + Bridge** — docs_superpowers_specs_2026_08_07_cc_controller_design_session_token_auth, docs_superpowers_specs_2026_08_07_cc_controller_design_supabase_broadcast, docs_superpowers_specs_2026_08_07_cc_controller_design_bridge, docs_superpowers_specs_2026_08_07_cc_controller_design_pty_manager [EXTRACTED 1.00]
- **CC Controller Superpowers Planning Corpus — Two Specs and Two Implementation Plans** — docs_superpowers_specs_2026_08_07_cc_controller_design_design_spec, docs_superpowers_specs_2026_08_08_cc_controller_projects_design_design_spec, docs_superpowers_plans_2026_08_07_cc_controller_implementation_plan, docs_superpowers_plans_2026_08_08_projects_settings_upload_implementation_plan [INFERRED 0.95]

## Communities (17 total, 6 thin omitted)

### Community 0 - "Electron Bridge & Main"
Cohesion: 0.22
Nodes (22): ALLOWED_EXTENSIONS, broadcastProjects(), buildMenu(), __dirname, extraPaths, getUptime(), setTrayMenu(), startSession() (+14 more)

### Community 1 - "Desktop Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, dotenv, node-pty, @supabase/supabase-js, ws, devDependencies, electron, electron-builder (+14 more)

### Community 2 - "Brand & Architecture Docs"
Cohesion: 0.13
Nodes (22): CC Controller Mac Tray Icon — Orange Rounded Square with Interlocking Double-C Mark in White/Salmon, Electron Builder Config (DMG packaging), CC Controller v1 Implementation Plan, CC Controller Projects, Settings & File Upload Implementation Plan, Bridge — Supabase Realtime Connection Manager (bidirectional token-validated channel), CC Controller v1 Design Spec (2026-08-07), PtyManager — node-pty Wrapper that Spawns Claude in a Pseudo-Terminal, Static Session Token Auth — Single Security Layer for PWA-to-Electron Events (+14 more)

### Community 3 - "PWA Components"
Cohesion: 0.17
Nodes (14): ALLOWED, FileUpload(), ProjectsList(), EMPTY_ENV, ENV_KEYS, SettingsSheet(), EFFORTS, loadProjects() (+6 more)

### Community 5 - "Netlify & Build Tools"
Cohesion: 0.14
Nodes (13): @netlify/plugin-nextjs, tailwindcss, @tailwindcss/postcss, devDependencies, @netlify/plugin-nextjs, tailwindcss, @tailwindcss/postcss, name (+5 more)

### Community 6 - "Next.js & React"
Cohesion: 0.18
Nodes (11): next, react, react-dom, dependencies, next, react, react-dom, @supabase/supabase-js (+3 more)

### Community 7 - "Web Core Config"
Cohesion: 0.18
Nodes (10): dependencies, @swc/helpers, @swc/helpers, name, private, scripts, desktop, web (+2 more)

### Community 9 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

## Knowledge Gaps
- **57 isolated node(s):** `name`, `version`, `type`, `main`, `dev` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Bridge` connect `Bridge Class API` to `Electron Bridge & Main`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `PtyManager` connect `PTY Process Manager` to `Electron Bridge & Main`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Next.js & React` to `Netlify & Build Tools`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Desktop Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Brand & Architecture Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `Netlify & Build Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._