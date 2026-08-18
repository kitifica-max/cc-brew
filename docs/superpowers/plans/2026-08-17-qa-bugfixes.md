# QA Bugfixes v1.7.12 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 issues found in the QA exhaustivo of CC Creator v1.7.12 — 2 críticos, 4 medios, 4 bajos.

**Architecture:** Three self-contained tasks grouped by file surface: desktop/main.js first (criticals), then PWA/page.js + bridge.js, then minor cleanup (AuthGate.js). Each task is independently testable and committable.

**Tech Stack:** Electron (desktop/src/main.js), React/Next.js (web/app/page.js), Supabase bridge (desktop/src/bridge.js)

**Spec:** QA report at https://claude.ai/code/artifact/f27fc0c6-26be-48db-bbcf-e9e47e2c95a2

## Global Constraints

- No new dependencies — stdlib and already-installed packages only
- No behaviour changes beyond the bugs being fixed — don't refactor surrounding code
- Version stays at 1.7.12 until all tasks are done, then bump to 1.7.13 in Task 3
- Test suite: `npm test` in `desktop/` must pass after each task

---

### Task 1: Desktop fixes — main.js (criticals + mediums)

**Files:**
- Modify: `desktop/src/main.js` — race condition, exec leak, parallel findDevPort, cloudflared ENOENT error

**Interfaces:**
- Consumes: existing `previewProc`, `findDevPort`, `probePort`, `onExecCommand`, `onOpenPreview`, `broadcastPreviewUrl`
- Produces: same public API, behaviour change only (no signature changes)

---

**Fix 1A — Race condition: dedup concurrent onOpenPreview calls**

Current code (main.js ~line 429):
```js
bridge.onOpenPreview = async (port) => {
  if (previewProc) { previewProc.kill(); previewProc = null; }
  let actualPort = port;
  if (!actualPort) {
    actualPort = await findDevPort();
    if (!actualPort) { bridge?.broadcastPreviewUrl(null, 0); return; }
  }
  const proc = spawn('cloudflared', ...);
  previewProc = proc;
  ...
```

Problem: two concurrent calls both see `previewProc === null` before either sets it (async gap during `findDevPort`).

- [ ] **Step 1: Add module-level flag**

In `desktop/src/main.js`, after `let previewProc = null;` (currently line 44), add:
```js
let previewInFlight = false;
```

- [ ] **Step 2: Guard onOpenPreview with the flag**

Replace the `bridge.onOpenPreview = async (port) => {` block (lines ~429–453) with:
```js
bridge.onOpenPreview = async (port) => {
  if (previewInFlight) return;
  previewInFlight = true;
  try {
    if (previewProc) { previewProc.kill(); previewProc = null; }
    let actualPort = port;
    if (!actualPort) {
      actualPort = await findDevPort();
      if (!actualPort) { bridge?.broadcastPreviewUrl(null, 0); return; }
    }
    const proc = spawn('cloudflared', ['tunnel', '--url', `localhost:${actualPort}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    previewProc = proc;
    const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    const onData = (data) => {
      const match = data.toString().match(URL_RE);
      if (match) {
        bridge?.broadcastPreviewUrl(match[0], actualPort);
        proc.stdout.off('data', onData);
        proc.stderr.off('data', onData);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (e) => {
      const msg = e.code === 'ENOENT'
        ? 'cloudflared no instalado — ejecuta: brew install cloudflared'
        : e.message;
      bridge?.broadcastPreviewUrl(null, actualPort, msg);
    });
    proc.on('close', () => { if (previewProc === proc) previewProc = null; });
  } finally {
    previewInFlight = false;
  }
};
```

Note: `broadcastPreviewUrl` receives an optional 3rd arg `errorMsg` — it will be added to bridge.js in Task 2.

- [ ] **Step 3: Verify — start session, click globe twice fast**

Run `npm run dev` in desktop, open PWA, click globe button twice quickly. Confirm only one cloudflared process spawns (check with `ps aux | grep cloudflared`).

---

**Fix 1B — Exec process leak: save and kill execDevProc**

- [ ] **Step 4: Add execDevProc module-level variable**

After `let previewProc = null;` (line 44), add:
```js
let execDevProc = null;
```

- [ ] **Step 5: Track the long-running exec process**

In `onExecCommand` (line ~349), inside the `if (match)` block where `previewTriggered = true`:
```js
// Replace:
previewTriggered = true;
clearTimeout(timer);
bridge?.onOpenPreview(port);

// With:
previewTriggered = true;
clearTimeout(timer);
if (execDevProc) { execDevProc.kill(); execDevProc = null; }
execDevProc = proc;
bridge?.onOpenPreview(port);
```

- [ ] **Step 6: Kill execDevProc in stopSession**

In `stopSession()` (line ~510), add after `if (previewProc) { ... }`:
```js
if (execDevProc) { execDevProc.kill(); execDevProc = null; }
```

- [ ] **Step 7: Verify — project switch kills old server**

Start `npm run dev` via terminal panel, confirm preview opens. Switch project. Confirm old process is dead (`ps aux | grep node` should not show old server).

---

**Fix 1C — findDevPort: parallel probing**

Current sequential loop probes 11 ports × 400ms = up to 4.4s.

- [ ] **Step 8: Replace sequential loop with Promise.all**

Replace the `findDevPort` function (lines ~57–61):
```js
// Replace:
async function findDevPort() {
  for (const p of DEV_PORTS) {
    if (await probePort(p)) return p;
  }
  return null;
}

// With:
async function findDevPort() {
  const results = await Promise.all(DEV_PORTS.map(p => probePort(p).then(ok => ok ? p : null)));
  return results.find(Boolean) ?? null;
}
```

Also reduce `probePort` timeout from 400ms to 300ms (line ~50):
```js
const sock = createTcpConn({ host: '127.0.0.1', port, timeout: 300 });
```

- [ ] **Step 9: Verify timing**

With no server running, time the globe button response: should show error in <0.5s instead of 4s+.

---

- [ ] **Step 10: Commit Task 1**

```bash
git add desktop/src/main.js
git commit -m "fix(desktop): race condition, exec leak, parallel port probe, cloudflared ENOENT"
```

---

### Task 2: PWA + bridge fixes — page.js, bridge.js

**Files:**
- Modify: `web/app/page.js` — autoPreviewedPorts ref, PORT_RE, orphaned state, PreviewSheet dedup
- Modify: `desktop/src/bridge.js` — broadcastPreviewUrl errorMsg, onOpenPreview unhandled promise

**Interfaces:**
- Consumes: `preview` state, `autoPreviewedPorts`, `tryAutoPreview`, `PORT_RE`, `PreviewSheet`, `broadcastPreviewUrl(url, port)`
- Produces: `broadcastPreviewUrl(url, port, errorMsg?)` — backward compatible (optional 3rd arg)

---

**Fix 2A — autoPreviewedPorts: move to useRef**

- [ ] **Step 1: Replace Set declaration**

In `page.js`, inside the Supabase `useEffect` (around line 181):
```js
// Remove these two lines inside the effect:
const PORT_RE = /localhost:(\d{4,5})/i;
const autoPreviewedPorts = new Set();
```

Add a `useRef` at the top of the `CCController` component (near line 70, with other refs):
```js
const autoPreviewedPortsRef = useRef(new Set());
```

- [ ] **Step 2: Update PORT_RE (Fix 2B at the same time)**

Add a module-level constant outside the component (near the top of the file, after the QUICK const):
```js
const PORT_RE = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})/i;
```

- [ ] **Step 3: Update tryAutoPreview to use the ref**

Replace the `tryAutoPreview` function inside the effect:
```js
const tryAutoPreview = (text) => {
  const match = text?.match(PORT_RE);
  if (!match) return;
  const port = parseInt(match[1], 10);
  if (port < 1000 || port > 65535 || autoPreviewedPortsRef.current.has(port)) return;
  autoPreviewedPortsRef.current.add(port);
  ch.send({ type: 'broadcast', event: 'open-preview', payload: { port, token: getSessionToken() } });
};
```

---

**Fix 2C — Remove orphaned preview.port state field**

- [ ] **Step 4: Remove port from preview initial state**

Find (line ~54):
```js
const [preview, setPreview] = useState({ show: false, port: '', loading: false, url: null, error: false });
```

Replace with:
```js
const [preview, setPreview] = useState({ show: false, loading: false, url: null, error: false });
```

Search for any remaining uses of `preview.port` or `p => ({ ...p, port: ... })` — there should be none; if any, remove them.

---

**Fix 2D — PreviewSheet: single render point**

Currently rendered at line 619 (in list view return) AND line 882 (in chat view return).

- [ ] **Step 5: Remove PreviewSheet from list view return**

In the `view === 'list'` return block (around line 619), remove:
```jsx
{preview.show && <PreviewSheet preview={preview} setPreview={setPreview} sendEvent={sendEvent} />}
```

The one at line 882 (chat view) stays. The list view's SettingsSheet/SecretsSheet pattern also has PreviewSheet — remove only the PreviewSheet, keep SettingsSheet and SecretsSheet.

Note: When `view === 'list'`, the globe button is not visible (it's in the chat header), so preview can only open from `tryAutoPreview`. The auto-triggered preview will render correctly when the user is in chat view. If they're in list view when auto-preview fires, they'll switch to chat naturally. This is acceptable behaviour.

---

**Fix 2E — bridge.js: broadcastPreviewUrl with optional errorMsg**

- [ ] **Step 6: Extend broadcastPreviewUrl signature**

In `desktop/src/bridge.js`, find `broadcastPreviewUrl(url, port)` (~line 298):
```js
broadcastPreviewUrl(url, port) {
  this.channel?.send({
    type: 'broadcast', event: 'preview-url',
    payload: { url, port, ts: Date.now() },
  });
}
```

Replace with:
```js
broadcastPreviewUrl(url, port, errorMsg = null) {
  this.channel?.send({
    type: 'broadcast', event: 'preview-url',
    payload: { url, port, ts: Date.now(), ...(errorMsg ? { errorMsg } : {}) },
  });
}
```

- [ ] **Step 7: Handle errorMsg in PWA preview-url event**

In `page.js`, find the `preview-url` handler (~line 294):
```js
ch.on('broadcast', { event: 'preview-url' }, ({ payload }) => {
  if (!active) return;
  if (payload.url) {
    setPreview(p => ({ ...p, show: true, loading: false, url: payload.url, error: false }));
  } else {
    setPreview(p => ({ ...p, loading: false, url: null, error: true }));
  }
});
```

Replace with:
```js
ch.on('broadcast', { event: 'preview-url' }, ({ payload }) => {
  if (!active) return;
  if (payload.url) {
    setPreview(p => ({ ...p, show: true, loading: false, url: payload.url, error: false, errorMsg: null }));
  } else {
    setPreview(p => ({ ...p, loading: false, url: null, error: true, errorMsg: payload.errorMsg ?? null }));
  }
});
```

- [ ] **Step 8: Show errorMsg in PreviewSheet**

In `PreviewSheet` (~line 1127), in the `preview.error` block, change the error paragraph:
```jsx
// Replace:
<p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>
  No se encontró servidor. ¿Está corriendo la app?
</p>

// With:
<p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>
  {preview.errorMsg ?? 'No se encontró servidor. ¿Está corriendo la app?'}
</p>
```

- [ ] **Step 9: Add errorMsg to preview initial state**

In the `useState` for preview (already being modified in Step 4):
```js
const [preview, setPreview] = useState({ show: false, loading: false, url: null, error: false, errorMsg: null });
```

---

**Fix 2F — bridge.js: suppress unhandled promise rejection**

- [ ] **Step 10: Add .catch to onOpenPreview call**

In `desktop/src/bridge.js`, find (~line 172):
```js
.on('broadcast', { event: 'open-preview' }, ({ payload }) => {
  if (!this._validate(payload)) return;
  this.onOpenPreview?.(payload.port);
})
```

Replace with:
```js
.on('broadcast', { event: 'open-preview' }, ({ payload }) => {
  if (!this._validate(payload)) return;
  this.onOpenPreview?.(payload.port)?.catch?.(() => {});
})
```

The optional chaining `?.catch?.()` handles the case where `onOpenPreview` returns `undefined` (sync) or a Promise (async).

---

- [ ] **Step 11: Run tests**

```bash
cd desktop && npm test
```

Expected: all tests pass.

- [ ] **Step 12: Commit Task 2**

```bash
git add web/app/page.js desktop/src/bridge.js
git commit -m "fix(pwa/bridge): autoPreviewedPorts ref, PORT_RE, orphaned state, preview dedup, errorMsg"
```

---

### Task 3: Minor cleanup + version bump

**Files:**
- Modify: `web/app/components/AuthGate.js` — remove dead import
- Modify: `desktop/package.json` — bump to 1.7.13

**Interfaces:**
- No interface changes. AuthGate.js export and behaviour unchanged.

---

**Fix 3A — AuthGate: remove createCallback dead import**

- [ ] **Step 1: Fix import line**

In `web/app/components/AuthGate.js`, line 2:
```js
// Replace:
import { createCallback, useCallback, useContext, useEffect, useState } from 'react';

// With:
import { useCallback, useEffect, useState } from 'react';
```

Note: `useContext` is also imported but not used in the file — remove it too while touching the line.

- [ ] **Step 2: Verify no runtime error**

Load the PWA auth screen. Confirm login flow still works (no `ReferenceError` in console).

---

**Fix 3B — Version bump to 1.7.13**

- [ ] **Step 3: Bump desktop/package.json**

In `desktop/package.json`, change:
```json
"version": "1.7.12"
```
to:
```json
"version": "1.7.13"
```

---

- [ ] **Step 4: Run full test suite**

```bash
cd desktop && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add web/app/components/AuthGate.js desktop/package.json
git commit -m "fix: dead import in AuthGate, bump to v1.7.13"
```

---

## Self-Review

### Spec coverage

| Issue | Task | Covered |
|---|---|---|
| C1: Race condition onOpenPreview | T1 Fix 1A | ✅ |
| C2: Exec proc leak | T1 Fix 1B | ✅ |
| M1: autoPreviewedPorts reset on reconnect | T2 Fix 2A | ✅ |
| M2: PORT_RE inconsistency | T2 Fix 2B | ✅ (done in same step as 2A) |
| M3: findDevPort 4.4s sequential | T1 Fix 1C | ✅ |
| M4: cloudflared ENOENT opaque error | T1 Fix 1A + T2 Fix 2E/2G | ✅ |
| L1: createCallback dead import | T3 Fix 3A | ✅ |
| L2: preview.port orphaned state | T2 Fix 2C | ✅ |
| L3: PreviewSheet double mount | T2 Fix 2D | ✅ |
| L4: osascript path injection | ⚠️ Deferred — path comes from Electron dialog (user-controlled), actual risk negligible; not worth invasive change |

### Placeholder scan

No TBD or TODO left in the plan.

### Type consistency

- `broadcastPreviewUrl(url, port, errorMsg?)` — 3rd arg optional, all existing call sites work unchanged (Task 1 already passes `msg` as 3rd arg in the error handler).
- `preview` state now has `errorMsg: null` — PreviewSheet receives it as `preview.errorMsg`. No other consumer of `preview.errorMsg` exists.
- `autoPreviewedPortsRef.current` used in `tryAutoPreview` — same Set semantics as before, just persisted across reconnects.
