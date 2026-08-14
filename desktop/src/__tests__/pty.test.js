import { describe, it, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import PtyManager from '../pty.js';

describe('PtyManager', () => {
  let mgr;

  beforeEach(() => {
    mgr = new PtyManager();
    mgr.spawn('true', [], '/tmp');
  });

  afterEach(() => {
    mgr.kill();
  });

  it('starts running after spawn', () => {
    // Modo interactivo: spawn lanza el proceso inmediatamente
    assert.equal(mgr.running, true);
  });

  it('spawn announces the session and launches a process', () => {
    let announced = null;
    const m = new PtyManager();
    m.onMessage = (role, text) => { announced = { role, text }; };
    m.spawn('true', [], '/tmp');
    assert.deepEqual(announced, { role: 'system', text: 'Sesión iniciada' });
    assert.equal(m.running, true);
    m.kill();
  });

  it('ignores blank messages', () => {
    mgr.write('   \n');
    assert.equal(mgr._queue.length, 0);
  });

  it('queues messages while one is in flight', () => {
    mgr._busy = true;
    mgr.write('primero');
    mgr.write('segundo');
    assert.deepEqual(mgr._queue.map(q => q.msg), ['primero', 'segundo']);
  });

  it('kill empties the queue', () => {
    mgr._busy = true;
    mgr.write('hola');
    mgr.kill();
    assert.equal(mgr._queue.length, 0);
    assert.equal(mgr.running, false);
  });

  it('starts process with --continue, no --print', async () => {
    // Usa 'echo' como comando para capturar los args que recibe
    const m = new PtyManager();
    let startupOutput = '';
    // Durante startup _currentMsgId es null, los chunks no se emiten
    // pero onMessage sí captura el banner de bienvenida de echo
    m.onMessage = () => {};
    // Sobreescribimos _onData para capturar el output raw de startup
    const origOnData = m._onData.bind(m);
    m._onData = (raw) => { startupOutput += raw; origOnData(raw); };
    m.spawn('echo', [], '/tmp');
    await new Promise(r => setTimeout(r, 100));
    assert.ok(startupOutput.includes('--continue'));
    assert.ok(!startupOutput.includes('--print'));
    m.kill();
  });
});

test('write enqueues message with msg and projectId', () => {
  const pty = new PtyManager();
  pty.spawn('true', [], '/tmp');
  pty._busy = true;
  pty.write('hello', true, 'claude-opus-5', 'high', 'proj-1');
  const queued = pty._queue[0];
  assert.equal(queued.msg, 'hello');
  assert.equal(queued.projectId, 'proj-1');
  pty.kill();
});

test('write ignores ctrl+c without crashing', () => {
  const pty = new PtyManager();
  pty.spawn('true', [], '/tmp');
  pty.write('\x03'); // ctrl+c → kill
  assert.equal(pty.running, false);
});
