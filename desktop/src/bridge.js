import { createClient as defaultCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import webpush from 'web-push';
import { existsSync, readFileSync } from 'fs';
import { extname, basename } from 'path';
import { AUTH_STORAGE_KEY } from './auth-store.js';

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
// Claude Code MCP warnings que llegan a stdout en modo --print
const MCP_WARN_RE = /Client\.\w+\(\) called but server does not advertise \w+ capability[^\n]*/g;
const MAX_HISTORY = 200;
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']);
const IMAGE_PATH_RE = /\/((?:[^\s"'<>\\]+)\.(?:png|jpg|jpeg|gif|svg|webp))/gi;
const IMAGE_MIME = { svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', png: 'image/png' };

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.md', '.markdown', '.json', '.csv', '.svg', '.zip']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default class Bridge {
  // ponytail: _createClient param para tests sin module mocking
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken, authStorage = null, _createClient = defaultCreateClient }) {
    this.client = _createClient(supabaseUrl, supabaseKey, {
      realtime: { transport: WebSocket },
      auth: {
        persistSession: Boolean(authStorage),
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(authStorage ? { storage: authStorage, storageKey: AUTH_STORAGE_KEY } : {}),
      },
    });
    this.supabaseKey = supabaseKey;
    this.sessionId = sessionId;
    this.sessionToken = sessionToken;
    this.channel = null;
    this.onInput = null;
    this.onCreateProject = null;
    this.onSwitchProject = null;
    this.onUploadFile = null;
    this.onOpenClaudeDesktop = null;
    this.onGetProjectState = null;
    this.onSaveEnv = null;
    this.onDeleteProject = null;
    this.onOpenFolder = null;
    this.onGetMcpConfig = null;
    this.onSaveMcpConfig = null;
    this.onOpenPreview = null;
    this.onPhaseChange = null;
    this.onStarterMessage = null;
    this.onGetEnv = null;
    this._heartbeatTimer = null;
    this._history = [];
    this._streamBuffers = new Map(); // msgId → { parts: string[], projectId }
    this._pushSubscriptions = []; // Web Push subscription objects from PWA
    this._accessToken = null;
    this._authSub = null;
  }

  // El canal es privado: Realtime evalúa las políticas de `realtime.messages`
  // contra el JWT del usuario, así que la anon key no basta para conectarse.
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this._accessToken = data.session.access_token;
    return data.session;
  }

  async restoreSession() {
    const { data } = await this.client.auth.getSession();
    this._accessToken = data?.session?.access_token ?? null;
    return Boolean(this._accessToken);
  }

  async signOut() {
    this._accessToken = null;
    await this.client.auth.signOut();
  }

  _validate(payload) {
    return payload?.token === this.sessionToken;
  }

  _addToHistory(entry) {
    this._history.push({ ...entry, ts: entry.ts ?? Date.now() });
    if (this._history.length > MAX_HISTORY) this._history.shift();
  }

  _sendHistory(projectId = null) {
    const msgs = this._history.filter(m =>
      projectId === null || m.projectId === projectId || m.projectId === null
    );
    if (!msgs.length) return;
    this.channel?.send({
      type: 'broadcast',
      event: 'history',
      payload: { messages: msgs.slice(-100), ts: Date.now() },
    });
  }

  connect() {
    if (!this._accessToken) {
      throw new Error('Sin sesión de Supabase: inicia sesión antes de conectar');
    }
    this.client.realtime.setAuth(this._accessToken);
    this._authSub = this.client.auth.onAuthStateChange?.((_event, session) => {
      if (!session?.access_token) return;
      this._accessToken = session.access_token;
      this.client.realtime.setAuth(session.access_token);
    })?.data?.subscription ?? null;

    this.channel = this.client
      .channel(`session:${this.sessionId}`, { config: { private: true } })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onInput?.(
          payload.text,
          payload.continue !== false,
          payload.model ?? 'claude-sonnet-4-6',
          payload.effort ?? 'medium',
          payload.skipPermissions ?? false,
        );
      })
      .on('broadcast', { event: 'create-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onCreateProject?.(payload.id, payload.name);
      })
      .on('broadcast', { event: 'switch-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onSwitchProject?.(payload.id);
      })
      .on('broadcast', { event: 'upload-file' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onUploadFile?.(payload.storageKey, payload.filename, payload.projectId);
      })
      .on('broadcast', { event: 'open-claude-desktop' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onOpenClaudeDesktop?.(payload.projectId);
      })
      .on('broadcast', { event: 'get-project-state' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onGetProjectState?.();
        this._sendHistory(payload.projectId ?? null);
      })
      .on('broadcast', { event: 'save-env' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onSaveEnv?.(payload.projectId, payload.env);
      })
      .on('broadcast', { event: 'rename-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onRenameProject?.(payload.id, payload.name);
      })
      .on('broadcast', { event: 'delete-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onDeleteProject?.(payload.id);
      })
      .on('broadcast', { event: 'open-folder' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onOpenFolder?.(payload.id);
      })
      .on('broadcast', { event: 'push-subscribe' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this._storePushSubscription(payload.subscription);
      })
      .on('broadcast', { event: 'get-mcp-config' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onGetMcpConfig?.(payload.projectId);
      })
      .on('broadcast', { event: 'save-mcp-config' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onSaveMcpConfig?.(payload.projectId, payload.mcpServers);
      })
      .on('broadcast', { event: 'open-preview' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onOpenPreview?.(payload.port);
      })
      .on('broadcast', { event: 'phase-change' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onPhaseChange?.(payload.projectId, payload.phase);
      })
      .on('broadcast', { event: 'starter-message' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onStarterMessage?.(payload.projectId);
      })
      .on('broadcast', { event: 'get-env' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onGetEnv?.(payload.projectId);
      })
      .subscribe();
  }

  broadcastChunk(msgId, text, done, projectId = null) {
    const clean = text ? text.replace(ANSI_RE, '').replace(MCP_WARN_RE, '') : '';

    if (!this._streamBuffers.has(msgId)) {
      this._streamBuffers.set(msgId, { parts: [], projectId });
    }
    const buf = this._streamBuffers.get(msgId);
    if (clean.trim()) buf.parts.push(clean); // preserva \n internos, filtra chunks vacíos

    if (done) {
      const fullText = buf.parts.join('').trim();
      this._streamBuffers.delete(msgId);
      if (fullText) {
        this._addToHistory({ role: 'claude', text: fullText, projectId: buf.projectId });
        // Detect image paths and broadcast them as separate image events
        const seen = new Set();
        let m;
        IMAGE_PATH_RE.lastIndex = 0;
        while ((m = IMAGE_PATH_RE.exec(fullText)) !== null) {
          const p = '/' + m[1];
          if (!seen.has(p)) { seen.add(p); this._uploadAndBroadcastImage(p, buf.projectId); }
        }
      }
      this.channel?.send({
        type: 'broadcast',
        event: 'chunk',
        payload: { msgId, text: fullText, done: true, projectId: buf.projectId, ts: Date.now() },
      });
    } else if (clean.trim()) {
      this.channel?.send({
        type: 'broadcast',
        event: 'chunk',
        payload: { msgId, text: clean, done: false, projectId: buf.projectId, ts: Date.now() },
      });
    }
  }

  async _uploadAndBroadcastImage(filePath, projectId = null) {
    try {
      if (!existsSync(filePath)) return;
      const ext = extname(filePath).slice(1).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) return;
      const buf = readFileSync(filePath);
      if (buf.length > 10 * 1024 * 1024) return;
      const key = `images/${this.sessionId}/${Date.now()}-${basename(filePath)}`;
      const { error } = await this.client.storage.from('uploads').upload(key, buf, {
        contentType: IMAGE_MIME[ext] ?? 'image/png',
        upsert: true,
      });
      if (error) return;
      const { data } = await this.client.storage.from('uploads').createSignedUrl(key, 3600);
      if (!data?.signedUrl) return;
      this._addToHistory({ role: 'claude', text: '', imageUrl: data.signedUrl, projectId });
      this.channel?.send({
        type: 'broadcast', event: 'image',
        payload: { url: data.signedUrl, projectId, ts: Date.now() },
      });
    } catch (_) {}
  }

  broadcastMessage(role, text, projectId = null) {
    const clean = text.replace(ANSI_RE, '');
    this._addToHistory({ role, text: clean, projectId });
    this.channel?.send({
      type: 'broadcast',
      event: 'message',
      payload: { role, text: clean, ts: Date.now(), ...(projectId && { projectId }) },
    });
  }

  async getFileMeta(storageKey) {
    const parts = storageKey.split('/');
    const folder = parts.slice(0, -1).join('/');
    const name = parts[parts.length - 1];
    const { data } = await this.client.storage.from('uploads').list(folder, { search: name });
    return data?.[0] ?? null;
  }

  broadcastProjectState(projects, activeId) {
    this.channel?.send({
      type: 'broadcast',
      event: 'project-state',
      payload: { projects, activeId, ts: Date.now() },
    });
  }

  async downloadFromStorage(storageKey) {
    const { data, error } = await this.client.storage.from('uploads').download(storageKey);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  broadcastPermission(text, msgId, projectId = null) {
    const clean = text.replace(ANSI_RE, '').trim();
    this._addToHistory({ role: 'permission', text: clean, msgId, projectId });
    this.channel?.send({
      type: 'broadcast',
      event: 'permission',
      payload: { text: clean, msgId, projectId, ts: Date.now() },
    });
    this.sendPush('CC Creator', '⚠️ Claude necesita un permiso — toca para responder').catch(() => {});
  }

  broadcastPreviewUrl(url, port) {
    this.channel?.send({
      type: 'broadcast', event: 'preview-url',
      payload: { url, port, ts: Date.now() },
    });
  }

  broadcastUsage(cost, inputTokens, projectId = null) {
    this.channel?.send({
      type: 'broadcast', event: 'usage',
      payload: { cost, inputTokens, projectId, ts: Date.now() },
    });
  }

  broadcastPhaseChange(projectId, phase) {
    this.channel?.send({
      type: 'broadcast', event: 'phase-changed',
      payload: { projectId, phase, ts: Date.now() },
    });
  }

  broadcastMcpConfig(projectId, mcpServers) {
    this.channel?.send({
      type: 'broadcast', event: 'mcp-config',
      payload: { projectId, mcpServers, ts: Date.now() },
    });
  }

  async deleteFromStorage(storageKey) {
    await this.client.storage.from('uploads').remove([storageKey]);
  }

  _storePushSubscription(sub) {
    if (!sub?.endpoint) return;
    this._pushSubscriptions = this._pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
    this._pushSubscriptions.push(sub);
  }

  async sendPush(title, body) {
    if (!this._pushSubscriptions.length) return;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return;
    webpush.setVapidDetails('mailto:kitifica@gmail.com', pub, priv);
    const payload = JSON.stringify({ title, body });
    const results = await Promise.allSettled(
      this._pushSubscriptions.map(sub => webpush.sendNotification(sub, payload))
    );
    // Limpiar subscripciones expiradas (410 Gone / 404 Not Found)
    let i = results.length;
    while (i--) {
      const r = results[i];
      if (r.status === 'rejected') {
        const code = r.reason?.statusCode;
        if (code === 410 || code === 404) this._pushSubscriptions.splice(i, 1);
      }
    }
  }

  startHeartbeat(intervalMs = 20_000) {
    this._heartbeatTimer = setInterval(() => {
      this.channel?.send({ type: 'broadcast', event: 'heartbeat', payload: { ts: Date.now() } });
    }, intervalMs);
  }

  disconnect() {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
    this._streamBuffers.clear();
    this._authSub?.unsubscribe();
    this._authSub = null;
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_BYTES };
