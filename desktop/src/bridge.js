import { createClient as defaultCreateClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

export default class Bridge {
  // ponytail: _createClient param para tests sin module mocking
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken, _createClient = defaultCreateClient }) {
    this.client = _createClient(supabaseUrl, supabaseKey, { realtime: { transport: WebSocket } });
    this.sessionId = sessionId;
    this.sessionToken = sessionToken;
    this.channel = null;
    this.onInput = null;
  }

  connect() {
    this.channel = this.client
      .channel(`session:${this.sessionId}`)
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (payload.token !== this.sessionToken) return;
        this.onInput?.(payload.text, payload.continue !== false);
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

  disconnect() {
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
