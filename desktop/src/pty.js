import { spawn } from 'child_process';

export default class PtyManager {
  constructor() {
    this._command = 'claude';
    this._cwd = process.env.HOME;
    this._queue = [];
    this._busy = false;
    this._currentProc = null;
    this.onMessage = null;
  }

  get running() { return this._currentProc !== null || this._busy; }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this._command = command;
    this._cwd = cwd;
    this.onMessage?.('system', 'Sesión iniciada');
  }

  write(text, continueConv = true, model = 'claude-sonnet-4-6', effort = 'medium', projectId = null) {
    if (text === '\x03') return;
    const msg = text.replace(/\n+$/, '').trim();
    if (!msg) return;
    this._queue.push({ msg, continueConv, model, effort, projectId });
    this._flush();
  }

  _flush() {
    if (this._busy || !this._queue.length) return;
    this._busy = true;
    const { msg, continueConv, model, effort, projectId } = this._queue.shift();
    const chunks = [];

    const args = ['--print'];
    if (continueConv) args.push('--continue');
    args.push('--model', model, '--effort', effort);

    const proc = spawn(this._command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });

    this._currentProc = proc;
    proc.stdin.write(msg + '\n');
    proc.stdin.end();

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      chunks.push('[TIMEOUT: sin respuesta en 2 min]');
    }, 120_000);

    proc.stdout.on('data', (d) => chunks.push(d.toString()));
    proc.stderr.on('data', (d) => chunks.push(d.toString()));
    proc.on('close', () => {
      clearTimeout(timeout);
      this._currentProc = null;
      const response = chunks.join('').trim();
      if (response) this.onMessage?.('claude', response, projectId);
      this._busy = false;
      this._flush();
    });
  }

  kill() {
    this._queue = [];
    this._busy = false;
    this._currentProc?.kill('SIGTERM');
    this._currentProc = null;
  }
}
