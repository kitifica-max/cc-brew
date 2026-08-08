import { createClient as defaultCreateClient } from '@supabase/supabase-js';

export default class Bridge {
  // ponytail: _createClient param para tests sin module mocking
  constructor({ supabaseUrl, supabaseKey, sessionId, sessionToken, _createClient = defaultCreateClient }) {
    this.client = _createClient(supabaseUrl, supabaseKey);
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
        this.onInput?.(payload.text);
      })
      .subscribe();
  }

  broadcast(text) {
    this.channel?.send({
      type: 'broadcast',
      event: 'output',
      payload: { text, ts: Date.now() },
    });
  }

  disconnect() {
    if (this.channel) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
