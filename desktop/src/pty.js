import { spawn } from 'child_process';

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const MCP_WARN_RE = /Client\.\w+\(\) called but server does not advertise \w+ capability[^\n]*/g;

// Prompt que Claude Code muestra cuando espera input del usuario (modo interactivo)
const PROMPT_RE = /(?:^|\n)>\s*$/;

// Patrón de solicitud de permiso
const PERMISSION_RE = /Allow\?\s*\[y\/n[^\]]*\]/i;

const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const QUIET_MS = 1500; // 1.5s sin output = respuesta terminada

export default class PtyManager {
  constructor(timeoutMs = Number(process.env.CLAUDE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
    this._command = 'claude';
    this._cwd = process.env.HOME;
    this._proc = null;
    this._buffer = '';
    this._busy = false;
    this._queue = [];
    this._currentMsgId = null;
    this._currentProjectId = null;
    this._permissionPending = false;
    this._readyForInput = false;
    this._quietTimer = null;
    this._hardTimer = null;

    this.onMessage = null;
    this.onChunk = null; // (msgId, text, done, projectId) => void
    this.onPermissionRequest = null; // (text, msgId, projectId) => void
  }

  get running() { return this._proc !== null; }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this._command = command;
    this._cwd = cwd;
    this.kill();
    this._startProcess();
  }

  _startProcess(model = 'claude-sonnet-4-6', effort = 'medium') {
    const args = ['--continue', '--model', model, '--effort', effort];
    const proc = spawn(this._command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._cwd,
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' },
    });
    this._proc = proc;

    proc.stdin.on('error', () => {});
    proc.on('error', (e) => this.onMessage?.('system', `Error: ${e.message}`));

    proc.stdout.on('data', (d) => {
      if (proc !== this._proc) return;
      this._onData(d.toString());
    });

    proc.stderr.on('data', () => {});

    proc.on('close', () => {
      if (proc !== this._proc) return;
      this._proc = null;
      this._busy = false;
      this._buffer = '';
      this._readyForInput = false;
      this._permissionPending = false;
      clearTimeout(this._quietTimer);
      clearTimeout(this._hardTimer);
      if (this._currentMsgId) {
        this.onChunk?.(this._currentMsgId, '', true, this._currentProjectId);
        this._currentMsgId = null;
      }
      this.onMessage?.('system', 'Sesión terminada');
    });

    this.onMessage?.('system', 'Sesión iniciada');
  }

  _onData(raw) {
    const text = raw.replace(ANSI_RE, '').replace(MCP_WARN_RE, '');
    this._buffer += text;

    // Stream al PWA (sin línea de prompt)
    if (this._currentMsgId) {
      const displayable = text.replace(/\n?>\s*$/, '');
      if (displayable.trim()) {
        this.onChunk?.(this._currentMsgId, displayable, false, this._currentProjectId);
      }
    }

    // Permiso detectado
    if (PERMISSION_RE.test(this._buffer)) {
      clearTimeout(this._quietTimer);
      clearTimeout(this._hardTimer);
      const permText = this._buffer.trim();
      this._buffer = '';
      this._permissionPending = true;
      this.onPermissionRequest?.(permText, this._currentMsgId, this._currentProjectId);
      return;
    }

    // Prompt detectado → respuesta terminada
    if (PROMPT_RE.test(this._buffer)) {
      this._onResponseDone();
      return;
    }

    // Timer de silencio como fallback
    clearTimeout(this._quietTimer);
    this._quietTimer = setTimeout(() => this._onResponseDone(), QUIET_MS);
  }

  _onResponseDone() {
    clearTimeout(this._quietTimer);
    clearTimeout(this._hardTimer);
    this._buffer = '';

    if (!this._readyForInput) {
      // Primer prompt → proceso listo
      this._readyForInput = true;
      this._flush();
      return;
    }

    if (this._currentMsgId) {
      this.onChunk?.(this._currentMsgId, '', true, this._currentProjectId);
      this._currentMsgId = null;
    }
    this._busy = false;
    this._flush();
  }

  write(text, continueConv = true, model = 'claude-sonnet-4-6', effort = 'medium', projectId = null) {
    if (text === '\x03') { this.kill(); return; }
    const msg = text.replace(/\n+$/, '').trim();
    if (!msg) return;

    // Respuesta a permiso → directo a stdin del proceso activo
    if (this._permissionPending && this._proc) {
      this._proc.stdin.write(msg + '\n');
      this._permissionPending = false;
      this._quietTimer = setTimeout(() => this._onResponseDone(), QUIET_MS * 2);
      return;
    }

    if (!this._proc) {
      this._startProcess(model, effort);
    }

    this._queue.push({ msg, projectId });
    if (this._readyForInput) this._flush();
  }

  _flush() {
    if (this._busy || !this._queue.length || !this._readyForInput || !this._proc) return;
    this._busy = true;
    const { msg, projectId } = this._queue.shift();
    this._currentMsgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    this._currentProjectId = projectId;
    this._buffer = '';
    this._proc.stdin.write(msg + '\n');

    this._hardTimer = setTimeout(() => {
      if (this._currentMsgId) {
        this.onChunk?.(this._currentMsgId, `\n[TIMEOUT: sin respuesta en ${Math.round(this.timeoutMs / 60_000)} min]`, true, this._currentProjectId);
        this._currentMsgId = null;
      }
      this._busy = false;
      this._flush();
    }, this.timeoutMs);
  }

  kill() {
    clearTimeout(this._quietTimer);
    clearTimeout(this._hardTimer);
    this._queue = [];
    this._busy = false;
    this._buffer = '';
    this._readyForInput = false;
    this._permissionPending = false;
    if (this._currentMsgId) {
      this.onChunk?.(this._currentMsgId, '', true, this._currentProjectId);
      this._currentMsgId = null;
    }
    if (this._proc) {
      this._proc.stdout.removeAllListeners();
      this._proc.stderr.removeAllListeners();
      this._proc.stdin.removeAllListeners();
      this._proc.removeAllListeners();
      this._proc.kill('SIGTERM');
      this._proc = null;
    }
  }
}
