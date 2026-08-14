import pty from 'node-pty';

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const MCP_WARN_RE = /Client\.\w+\(\) called but server does not advertise \w+ capability[^\n]*/g;
const PERMISSION_RE = /Do you want to proceed\?|requires approval|Allow\?\s*\[y\/n/i;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;

export default class PtyManager {
  constructor(timeoutMs = Number(process.env.CLAUDE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
    this._command = 'claude';
    this._cwd = process.env.HOME;
    this._proc = null;
    this._jsonBuf = '';
    this._busy = false;
    this._queue = [];
    this._currentMsgId = null;
    this._currentProjectId = null;
    this._permissionPending = false;
    this._hardTimer = null;
    this.onMessage = null;
    this.onChunk = null;
    this.onPermissionRequest = null;
  }

  get running() { return this._proc !== null; }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this._command = command;
    this._cwd = cwd;
  }

  write(text, continueConv = true, model = 'claude-sonnet-4-6', effort = 'medium', projectId = null) {
    if (text === '\x03') { this.kill(); return; }
    const msg = text.replace(/\n+$/, '').trim();
    if (!msg) return;

    if (this._permissionPending && this._proc) {
      // y → opción 1 (Yes), n → opción 3 (No) para el menú de Claude Code
      const response = msg === 'n' ? '3' : '1';
      this._proc.write(response + '\r');
      this._permissionPending = false;
      return;
    }

    this._queue.push({ msg, projectId, model, effort });
    if (!this._busy) this._flush();
  }

  _flush() {
    if (this._busy || !this._queue.length) return;
    this._busy = true;
    const { msg, projectId, model, effort } = this._queue.shift();
    this._currentMsgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    this._currentProjectId = projectId;
    this._jsonBuf = '';

    const proc = pty.spawn(this._command, [
      '--print', '--output-format', 'stream-json', '--verbose', '--continue',
      '--model', model, '--effort', effort,
    ], {
      name: 'xterm-color', cols: 220, rows: 50,
      cwd: this._cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });
    this._proc = proc;

    proc.onData((raw) => {
      if (this._proc !== proc) return;
      this._onData(raw);
    });

    proc.onExit(() => {
      if (this._proc !== proc) return;
      this._proc = null;
      clearTimeout(this._hardTimer);
      if (this._currentMsgId) {
        this.onChunk?.(this._currentMsgId, '', true, this._currentProjectId);
        this._currentMsgId = null;
      }
      this._busy = false;
      this._flush();
    });

    // Mensaje + EOF (Ctrl+D) — --print lee de stdin
    proc.write(msg + '\n');
    setTimeout(() => { if (this._proc === proc) proc.write('\x04'); }, 100);

    this._hardTimer = setTimeout(() => {
      if (this._currentMsgId) {
        this.onChunk?.(this._currentMsgId, `\n[TIMEOUT: sin respuesta en ${Math.round(this.timeoutMs / 60_000)} min]`, true, this._currentProjectId);
        this._currentMsgId = null;
      }
      this.kill();
    }, this.timeoutMs);
  }

  _onData(raw) {
    const text = raw.replace(ANSI_RE, '').replace(MCP_WARN_RE, '')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    if (PERMISSION_RE.test(text)) {
      this._permissionPending = true;
      this.onPermissionRequest?.(text.trim(), this._currentMsgId, this._currentProjectId);
      return;
    }

    this._jsonBuf += text;
    const lines = this._jsonBuf.split('\n');
    this._jsonBuf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        this._handleEvent(JSON.parse(line.trim()));
      } catch { /* línea no-JSON: ignorar (spinners, headers de tool use, etc.) */ }
    }
  }

  _handleEvent(event) {
    if (!this._currentMsgId) return;

    if (event.type === 'assistant') {
      const text = (event.message?.content ?? [])
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');
      if (text) this.onChunk?.(this._currentMsgId, text, false, this._currentProjectId);
    }

    if (event.type === 'permission_request') {
      this._permissionPending = true;
      this.onPermissionRequest?.(
        event.message ?? JSON.stringify(event.input ?? {}),
        this._currentMsgId,
        this._currentProjectId,
      );
    }
  }

  kill() {
    clearTimeout(this._hardTimer);
    this._queue = []; this._busy = false; this._jsonBuf = '';
    this._permissionPending = false;
    if (this._currentMsgId) {
      this.onChunk?.(this._currentMsgId, '', true, this._currentProjectId);
      this._currentMsgId = null;
    }
    if (this._proc) { try { this._proc.kill(); } catch (_) {} this._proc = null; }
  }
}
