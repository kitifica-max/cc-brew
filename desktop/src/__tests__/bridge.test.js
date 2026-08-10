import { describe, it, test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Bridge, { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '../bridge.js';

function makeMockClient() {
  const handlers = {};
  const send = mock.fn();
  const removeChannel = mock.fn();
  const channel = {
    on(type, filter, cb) { handlers[filter.event] = cb; return channel; },
    send,
    subscribe: mock.fn(() => channel),
  };
  const setAuth = mock.fn();
  const client = {
    channel: mock.fn(() => channel),
    removeChannel,
    realtime: { setAuth },
  };
  return { client, channel, handlers, send, removeChannel, setAuth };
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

  it('connect authenticates with supabase key', () => {
    bridge.connect();
    assert.equal(bridge.client.realtime.setAuth.mock.calls[0].arguments[0], 'key');
  });

  it('broadcastMessage sends message event with role and text', () => {
    bridge.connect();
    bridge.broadcastMessage('assistant', 'hello world');
    const call = send.mock.calls[0].arguments[0];
    assert.equal(call.event, 'message');
    assert.equal(call.payload.role, 'assistant');
    assert.equal(call.payload.text, 'hello world');
  });

  it('broadcastProjectState sends project-state event', () => {
    bridge.connect();
    const projects = [{ id: '1', name: 'A' }];
    bridge.broadcastProjectState(projects, '1');
    const call = send.mock.calls[0].arguments[0];
    assert.equal(call.event, 'project-state');
    assert.deepEqual(call.payload.projects, projects);
    assert.equal(call.payload.activeId, '1');
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

  it('onInput receives model and effort args', () => {
    let args = null;
    bridge.onInput = (...a) => { args = a; };
    bridge.connect();
    handlers['input']({ payload: { text: 'hi', token: 'secret', model: 'claude-opus-5', effort: 'high', continue: true } });
    assert.deepEqual(args, ['hi', true, 'claude-opus-5', 'high']);
  });

  it('onInput defaults model and effort when absent', () => {
    let args = null;
    bridge.onInput = (...a) => { args = a; };
    bridge.connect();
    handlers['input']({ payload: { text: 'hi', token: 'secret' } });
    assert.equal(args[2], 'claude-sonnet-4-6');
    assert.equal(args[3], 'medium');
  });

  it('disconnect removes channel', () => {
    bridge.connect();
    bridge.disconnect();
    assert.equal(removeChannel.mock.calls.length, 1);
  });
});

test('connect subscribes to all new events', () => {
  const events = [];
  const mockChannel = {
    on(type, { event }, cb) { events.push(event); return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 't', _createClient: () => mockClient });
  b.connect();
  assert.ok(events.includes('create-project'), 'missing create-project');
  assert.ok(events.includes('switch-project'), 'missing switch-project');
  assert.ok(events.includes('upload-file'), 'missing upload-file');
  assert.ok(events.includes('open-claude-desktop'), 'missing open-claude-desktop');
});

test('rejects create-project with wrong token', () => {
  const handlers = {};
  const mockChannel = {
    on(type, { event }, cb) { handlers[event] = cb; return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 'tok', _createClient: () => mockClient });
  b.connect();
  let called = false;
  b.onCreateProject = () => { called = true; };
  handlers['create-project']({ payload: { token: 'bad', id: '1', name: 'X' } });
  assert.equal(called, false);
});

test('calls onCreateProject with correct args', () => {
  const handlers = {};
  const mockChannel = {
    on(type, { event }, cb) { handlers[event] = cb; return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 'tok', _createClient: () => mockClient });
  b.connect();
  let result = null;
  b.onCreateProject = (id, name) => { result = { id, name }; };
  handlers['create-project']({ payload: { token: 'tok', id: 'p1', name: 'My Project' } });
  assert.deepEqual(result, { id: 'p1', name: 'My Project' });
});

test('calls onSwitchProject with id', () => {
  const handlers = {};
  const mockChannel = {
    on(type, { event }, cb) { handlers[event] = cb; return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 'tok', _createClient: () => mockClient });
  b.connect();
  let received = null;
  b.onSwitchProject = (id) => { received = id; };
  handlers['switch-project']({ payload: { token: 'tok', id: 'p2' } });
  assert.equal(received, 'p2');
});

test('calls onUploadFile with storageKey, filename, projectId', () => {
  const handlers = {};
  const mockChannel = {
    on(type, { event }, cb) { handlers[event] = cb; return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 'tok', _createClient: () => mockClient });
  b.connect();
  let args = null;
  b.onUploadFile = (sk, fn, pid) => { args = { sk, fn, pid }; };
  handlers['upload-file']({ payload: { token: 'tok', storageKey: 'uploads/abc.pdf', filename: 'abc.pdf', projectId: 'p1' } });
  assert.deepEqual(args, { sk: 'uploads/abc.pdf', fn: 'abc.pdf', pid: 'p1' });
});

test('calls onOpenClaudeDesktop with projectId', () => {
  const handlers = {};
  const mockChannel = {
    on(type, { event }, cb) { handlers[event] = cb; return mockChannel; },
    subscribe: () => mockChannel,
    send: () => {},
  };
  const mockClient = { channel: () => mockChannel, removeChannel: () => {}, realtime: { setAuth: () => {} } };
  const b = new Bridge({ supabaseUrl: 'x', supabaseKey: 'x', sessionId: 's', sessionToken: 'tok', _createClient: () => mockClient });
  b.connect();
  let received = null;
  b.onOpenClaudeDesktop = (pid) => { received = pid; };
  handlers['open-claude-desktop']({ payload: { token: 'tok', projectId: 'p3' } });
  assert.equal(received, 'p3');
});

test('ALLOWED_EXTENSIONS contains expected types', () => {
  for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.md', '.json', '.csv', '.svg', '.zip']) {
    assert.ok(ALLOWED_EXTENSIONS.has(ext), `missing ${ext}`);
  }
});

test('MAX_FILE_BYTES is 10MB', () => {
  assert.equal(MAX_FILE_BYTES, 10 * 1024 * 1024);
});
