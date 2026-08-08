import { spawn } from 'child_process';

export default class PtyManager {
  constructor() {
    this._command = 'claude';
    this._cwd = process.env.HOME;
    this._queue = [];
    this._busy = false;
    this.onMessage = null;
  }

  get running() { return true; }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this._command = command;
    this._cwd = cwd;
    this.onMessage?.('system', 'Sesión iniciada');
  }

  write(text) {
    if (text === '\x03') return;
    const msg = text.replace(/\n+$/, '').trim();
    if (!msg) return;
    this._queue.push(msg);
    this._flush();
  }

  _flush() {
    if (this._busy || !this._queue.length) return;
    this._busy = true;
    const msg = this._queue.shift();
    const chunks = [];

    const proc = spawn(this._command, ['--print', '--continue'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });

    proc.stdin.write(msg + '\n');
    proc.stdin.end();

    proc.stdout.on('data', (d) => chunks.push(d.toString()));
    proc.stderr.on('data', (d) => chunks.push(d.toString()));
    proc.on('close', () => {
      const response = chunks.join('').trim();
      if (response) this.onMessage?.('claude', response);
      this._busy = false;
      this._flush();
    });
  }

  kill() {
    this._queue = [];
    this._busy = false;
  }
}
