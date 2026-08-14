import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import PtyManager from '../pty.js';

// Mock de proc PTY — evita depender del binario nativo en tests
function mockProc() {
  const written = [];
  return {
    written,
    write: (t) => written.push(t),
    kill: () => {},
    onData: () => {},
    onExit: () => {},
  };
}

describe('PtyManager', () => {
  it('starts idle before any message', () => {
    const m = new PtyManager();
    assert.equal(m.running, false);
    assert.equal(m._busy, false);
  });

  it('kill with no process is a no-op', () => {
    const m = new PtyManager();
    assert.doesNotThrow(() => m.kill());
    assert.equal(m.running, false);
  });

  it('ignores blank messages', () => {
    const m = new PtyManager();
    m.write('   \n');
    assert.equal(m._queue.length, 0);
  });

  it('queues messages while busy', () => {
    const m = new PtyManager();
    m._proc = mockProc(); // proc activo → no lanza _flush real
    m._busy = true;
    m.write('primero');
    m.write('segundo');
    assert.deepEqual(m._queue.map(q => q.msg), ['primero', 'segundo']);
    m.kill();
  });

  it('kill empties queue and clears proc', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m._busy = true;
    m.write('hola');
    m.kill();
    assert.equal(m._queue.length, 0);
    assert.equal(m.running, false);
  });

  it('permission "y" routes "1" to PTY (Yes), not queue', () => {
    const m = new PtyManager();
    const proc = mockProc();
    m._proc = proc;
    m._permissionPending = true;
    m.write('y');
    assert.equal(m._permissionPending, false);
    assert.equal(m._queue.length, 0);
    assert.ok(proc.written.some(t => t.startsWith('1')));
  });

  it('permission "n" routes "3" to PTY (No)', () => {
    const m = new PtyManager();
    const proc = mockProc();
    m._proc = proc;
    m._permissionPending = true;
    m.write('n');
    assert.ok(proc.written.some(t => t.startsWith('3')));
  });

  it('ctrl+c kills session', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m.write('\x03');
    assert.equal(m.running, false);
  });

  it('permission detection sets _permissionPending', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m._currentMsgId = 'abc';
    let permText = null;
    m.onPermissionRequest = (text) => { permText = text; };
    m._onData('Claude wants to write to file.js\nDo you want to proceed?\n1. Yes\n2. No\n');
    assert.equal(m._permissionPending, true);
    assert.ok(permText !== null);
  });

  it('_handleEvent extracts assistant text and emits chunk', () => {
    const m = new PtyManager();
    m._currentMsgId = 'test123';
    const chunks = [];
    m.onChunk = (id, text, done) => chunks.push({ text, done });
    m._handleEvent({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hola mundo' }] }
    });
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].text, 'Hola mundo');
    assert.equal(chunks[0].done, false);
  });

  it('_handleEvent ignores tool_use and result events', () => {
    const m = new PtyManager();
    m._currentMsgId = 'test123';
    const chunks = [];
    m.onChunk = (id, text, done) => chunks.push({ text, done });
    m._handleEvent({ type: 'tool_use', name: 'bash', input: { command: 'ls' } });
    m._handleEvent({ type: 'result', result: 'done' });
    assert.equal(chunks.length, 0);
  });

  it('_handleEvent handles permission_request event', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m._currentMsgId = 'abc';
    let permText = null;
    m.onPermissionRequest = (text) => { permText = text; };
    m._handleEvent({ type: 'permission_request', message: 'Allow bash?', input: {} });
    assert.equal(m._permissionPending, true);
    assert.equal(permText, 'Allow bash?');
  });

  it('non-JSON lines in _onData are silently ignored', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m._currentMsgId = 'abc';
    const chunks = [];
    m.onChunk = (id, text) => chunks.push(text);
    assert.doesNotThrow(() => {
      m._onData('⠋ Thinking...\n⠙ Thinking...\nBash command\n');
    });
    assert.equal(chunks.length, 0); // non-JSON ignorado
  });
});

test('spawn stores command and cwd', () => {
  const m = new PtyManager();
  m.spawn('claude', [], '/tmp/test');
  assert.equal(m._command, 'claude');
  assert.equal(m._cwd, '/tmp/test');
  assert.equal(m.running, false); // spawn no inicia proceso inmediatamente
});
