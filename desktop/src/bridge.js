import { createClient as defaultCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { AUTH_STORAGE_KEY } from './auth-store.js';

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const MAX_HISTORY = 200;

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
    this._heartbeatTimer = null;
    this._history = [];
    this._streamBuffers = new Map(); // msgId → { parts: string[], projectId }
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
      .on('broadcast', { event: 'delete-project' }, ({ payload }) => {
        if (!this._validate(payload)) return;
        this.onDeleteProject?.(payload.id);
      })
      .subscribe();
  }

  broadcastChunk(msgId, text, done, projectId = null) {
    const clean = text ? text.replace(ANSI_RE, '') : '';

    if (!this._streamBuffers.has(msgId)) {
      this._streamBuffers.set(msgId, { parts: [], projectId });
    }
    const buf = this._streamBuffers.get(msgId);
    if (clean) buf.parts.push(clean);

    if (done) {
      const fullText = buf.parts.join('').trim();
      this._streamBuffers.delete(msgId);
      if (fullText) {
        this._addToHistory({ role: 'claude', text: fullText, projectId: buf.projectId });
      }
      this.channel?.send({
        type: 'broadcast',
        event: 'chunk',
        payload: { msgId, text: '', done: true, projectId: buf.projectId, ts: Date.now() },
      });
    } else if (clean) {
      this.channel?.send({
        type: 'broadcast',
        event: 'chunk',
        payload: { msgId, text: clean, done: false, projectId: buf.projectId, ts: Date.now() },
      });
    }
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

  async deleteFromStorage(storageKey) {
    await this.client.storage.from('uploads').remove([storageKey]);
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
