import { spawn } from 'child_process';

const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const MODEL_RE = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const EFFORTS = new Set(['high', 'medium', 'low']);

export default class PtyManager {
  constructor(timeoutMs = Number(process.env.CLAUDE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
    this._command = 'claude';
    this._cwd = process.env.HOME;
    this._queue = [];
    this._busy = false;
    this._currentProc = null;
    this.onMessage = null;
    this.onChunk = null; // (msgId, text, done, projectId) => void
  }

  get running() { return this._currentProc !== null || this._busy; }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this._command = command;
    this._cwd = cwd;
    this.onMessage?.('system', 'Sesión iniciada');
  }

  write(text, continueConv = true, model = 'claude-sonnet-4-6', effort = 'medium', projectId = null, skipPermissions = false) {
    if (text === '\x03') return;
    const msg = text.replace(/\n+$/, '').trim();
    if (!msg) return;
    if (!MODEL_RE.test(model)) model = 'claude-sonnet-4-6';
    if (!EFFORTS.has(effort)) effort = 'medium';
    this._queue.push({ msg, continueConv, model, effort, projectId, skipPermissions: Boolean(skipPermissions) });
    this._flush();
  }

  _flush() {
    if (this._busy || !this._queue.length) return;
    this._busy = true;
    const { msg, continueConv, model, effort, projectId, skipPermissions } = this._queue.shift();
    const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const stderrChunks = [];

    const args = ['--print'];
    if (continueConv) args.push('--continue');
    args.push('--model', model, '--effort', effort);
    if (skipPermissions) args.push('--dangerously-skip-permissions');

    const proc = spawn(this._command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });

    this._currentProc = proc;
    // Si el proceso muere antes de leer stdin, el EPIPE tumbaría el proceso principal.
    proc.stdin.on('error', () => {});
    proc.on('error', (e) => stderrChunks.push(`[ERROR: ${e.message}]`));
    proc.stdin.write(msg + '\n');
    proc.stdin.end();

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      stderrChunks.push(`[TIMEOUT: sin respuesta en ${Math.round(this.timeoutMs / 60_000)} min]`);
    }, this.timeoutMs);

    proc.stdout.on('data', (d) => {
      this.onChunk?.(msgId, d.toString(), false, projectId);
    });
    proc.stderr.on('data', (d) => stderrChunks.push(d.toString()));

    proc.on('close', () => {
      clearTimeout(timeout);
      this._currentProc = null;
      const errText = stderrChunks.join('').trim();
      this.onChunk?.(msgId, errText ? '\n' + errText : '', true, projectId);
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
