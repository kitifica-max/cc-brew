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
  it('starts idle before spawn', () => {
    const m = new PtyManager();
    assert.equal(m.running, false);
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
    m._proc = mockProc(); // proc activo → no lanza _startProcess
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
    m._readyForInput = true;
    m.write('hola');
    m.kill();
    assert.equal(m._queue.length, 0);
    assert.equal(m.running, false);
  });

  it('permission response routes to PTY write, not queue', () => {
    const m = new PtyManager();
    const proc = mockProc();
    m._proc = proc;
    m._permissionPending = true;
    m._readyForInput = true;
    m.write('y');
    assert.equal(m._permissionPending, false);
    assert.equal(m._queue.length, 0);
    assert.ok(proc.written.some(t => t.startsWith('y')));
  });

  it('ctrl+c kills session', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m.write('\x03');
    assert.equal(m.running, false);
  });

  it('_onResponseDone sets readyForInput on first call', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    assert.equal(m._readyForInput, false);
    m._onResponseDone();
    assert.equal(m._readyForInput, true);
  });

  it('_onResponseDone emits done chunk on second call', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    const chunks = [];
    m.onChunk = (id, text, done) => chunks.push({ text, done });
    m._readyForInput = true;
    m._currentMsgId = 'abc';
    m._onResponseDone();
    assert.ok(chunks.some(c => c.done === true));
    assert.equal(m._currentMsgId, null);
    assert.equal(m._busy, false);
  });

  it('permission detection sets _permissionPending', () => {
    const m = new PtyManager();
    m._proc = mockProc();
    m._readyForInput = true;
    m._currentMsgId = 'abc';
    let permText = null;
    m.onPermissionRequest = (text) => { permText = text; };
    m._onData('Claude wants to write to file.js\nAllow? [y/n/a/!/?]: ');
    assert.equal(m._permissionPending, true);
    assert.ok(permText !== null);
  });
});

test('spawn announces session via onMessage', (t) => {
  // spawn() solo registra command/cwd y llama _startProcess
  // mockeamos _startProcess para no necesitar binario nativo
  const m = new PtyManager();
  let announced = null;
  m.onMessage = (role, text) => { announced = { role, text }; };
  m._startProcess = () => {
    m.onMessage?.('system', 'Sesión iniciada');
  };
  m.spawn('claude', [], '/tmp');
  assert.deepEqual(announced, { role: 'system', text: 'Sesión iniciada' });
});
