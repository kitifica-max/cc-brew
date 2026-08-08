import { describe, it, test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import PtyManager from '../pty.js';

function makeMockPty() {
  const proc = {
    _onData: null,
    onData(cb) { this._onData = cb; },
    write: mock.fn(),
    kill: mock.fn(),
  };
  return { lib: { spawn: mock.fn(() => proc) }, proc };
}

describe('PtyManager', () => {
  let mgr, proc;

  beforeEach(() => {
    const { lib, proc: p } = makeMockPty();
    proc = p;
    mgr = new PtyManager(lib);
  });

  it('starts not running', () => {
    assert.equal(mgr.running, false);
  });

  it('spawn sets running=true', () => {
    mgr.spawn();
    assert.equal(mgr.running, true);
  });

  it('calls onOutput when process emits data', () => {
    let received = '';
    mgr.onOutput = (d) => { received = d; };
    mgr.spawn();
    proc._onData('hello');
    assert.equal(received, 'hello');
  });

  it('write forwards to process', () => {
    mgr.spawn();
    mgr.write('y\n');
    assert.equal(proc.write.mock.calls[0].arguments[0], 'y\n');
  });

  it('kill sets running=false', () => {
    mgr.spawn();
    mgr.kill();
    assert.equal(mgr.running, false);
  });
});

test('write builds correct args for model and effort', () => {
  const pty = new PtyManager();
  pty.spawn('echo', [], '/tmp');
  pty._busy = true;
  pty.write('hello', true, 'claude-opus-5', 'high');
  const queued = pty._queue[0];
  assert.equal(queued.model, 'claude-opus-5');
  assert.equal(queued.effort, 'high');
  assert.equal(queued.continueConv, true);
  pty.kill();
});
