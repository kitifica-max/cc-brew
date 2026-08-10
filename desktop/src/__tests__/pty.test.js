import { describe, it, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import PtyManager from '../pty.js';

describe('PtyManager', () => {
  let mgr;

  beforeEach(() => {
    mgr = new PtyManager();
    mgr.spawn('true', [], '/tmp');
  });

  it('starts idle', () => {
    assert.equal(mgr.running, false);
  });

  it('spawn announces the session without launching a process', () => {
    let announced = null;
    const m = new PtyManager();
    m.onMessage = (role, text) => { announced = { role, text }; };
    m.spawn('true', [], '/tmp');
    assert.deepEqual(announced, { role: 'system', text: 'Sesión iniciada' });
    assert.equal(m.running, false);
  });

  it('ignores blank messages', () => {
    mgr.write('   \n');
    assert.equal(mgr._queue.length, 0);
    assert.equal(mgr.running, false);
  });

  it('queues messages while one is in flight', () => {
    mgr._busy = true;
    mgr.write('primero');
    mgr.write('segundo');
    assert.deepEqual(mgr._queue.map(q => q.msg), ['primero', 'segundo']);
    mgr.kill();
  });

  it('kill empties the queue', () => {
    mgr._busy = true;
    mgr.write('hola');
    mgr.kill();
    assert.equal(mgr._queue.length, 0);
    assert.equal(mgr.running, false);
  });

  it('runs the command with the expected flags and reports its output', async () => {
    const m = new PtyManager();
    m.spawn('echo', [], '/tmp');
    const output = new Promise(resolve => {
      m.onChunk = (_id, text, done) => { if (!done) resolve(text.trim()); };
    });
    m.write('hola', true, 'claude-opus-5', 'high');
    assert.equal(await output, '--print --continue --model claude-opus-5 --effort high');
  });
});

test('write keeps model and effort with the queued message', () => {
  const pty = new PtyManager();
  pty.spawn('true', [], '/tmp');
  pty._busy = true;
  pty.write('hello', true, 'claude-opus-5', 'high');
  const queued = pty._queue[0];
  assert.equal(queued.model, 'claude-opus-5');
  assert.equal(queued.effort, 'high');
  assert.equal(queued.continueConv, true);
  pty.kill();
});

test('write falls back to safe defaults for unknown model and effort', () => {
  const pty = new PtyManager();
  pty.spawn('true', [], '/tmp');
  pty._busy = true;
  pty.write('hello', true, '--dangerously-skip-permissions', 'turbo');
  const queued = pty._queue[0];
  assert.equal(queued.model, 'claude-sonnet-4-6');
  assert.equal(queued.effort, 'medium');
  pty.kill();
});
