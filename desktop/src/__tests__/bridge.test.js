import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Bridge from '../bridge.js';

function makeMockClient() {
  const handlers = {};
  const send = mock.fn();
  const removeChannel = mock.fn();
  const channel = {
    on(type, filter, cb) { handlers[filter.event] = cb; return channel; },
    send,
    subscribe: mock.fn(() => channel),
  };
  const client = {
    channel: mock.fn(() => channel),
    removeChannel,
  };
  return { client, channel, handlers, send, removeChannel };
}

const OPTS = {
  supabaseUrl: 'https://x.supabase.co',
  supabaseKey: 'key',
  sessionId: 'main',
  sessionToken: 'secret',
};

describe('Bridge', () => {
  let bridge, send, handlers, removeChannel;

  beforeEach(() => {
    const mock_ = makeMockClient();
    send = mock_.send;
    handlers = mock_.handlers;
    removeChannel = mock_.removeChannel;
    bridge = new Bridge({ ...OPTS, _createClient: () => mock_.client });
    send.mock.resetCalls();
  });

  it('connect subscribes to correct channel', () => {
    bridge.connect();
    assert.equal(bridge.client.channel.mock.calls[0].arguments[0], 'session:main');
  });

  it('broadcast sends output event', () => {
    bridge.connect();
    bridge.broadcast('hello world');
    const call = send.mock.calls[0].arguments[0];
    assert.equal(call.event, 'output');
    assert.equal(call.payload.text, 'hello world');
  });

  it('rejects input with wrong token', () => {
    let received = null;
    bridge.onInput = (t) => { received = t; };
    bridge.connect();
    handlers['input']({ payload: { text: 'y\n', token: 'wrong' } });
    assert.equal(received, null);
  });

  it('accepts input with correct token', () => {
    let received = null;
    bridge.onInput = (t) => { received = t; };
    bridge.connect();
    handlers['input']({ payload: { text: 'y\n', token: 'secret' } });
    assert.equal(received, 'y\n');
  });

  it('disconnect removes channel', () => {
    bridge.connect();
    bridge.disconnect();
    assert.equal(removeChannel.mock.calls.length, 1);
  });
});
