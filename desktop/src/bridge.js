import { createClient as defaultCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.md', '.json', '.csv', '.svg', '.zip']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export default class Bridge {
  // ponytail: _createClient param para tests sin module mocking
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken, _createClient = defaultCreateClient }) {
    this.client = _createClient(supabaseUrl, supabaseKey, { realtime: { transport: WebSocket } });
    this.sessionId = sessionId;
    this.sessionToken = sessionToken;
    this.channel = null;
    this.onInput = null;
    this.onCreateProject = null;
    this.onSwitchProject = null;
    this.onUploadFile = null;
    this.onOpenClaudeDesktop = null;
  }

  _validate(payload) {
    return payload.token === this.sessionToken;
  }

  connect() {
    this.channel = this.client
      .channel(`session:${this.sessionId}`)
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
      .subscribe();
  }

  broadcastMessage(role, text) {
    this.channel?.send({
      type: 'broadcast',
      event: 'message',
      payload: { role, text, ts: Date.now() },
    });
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

  disconnect() {
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_BYTES };
