import ptyDefault from 'node-pty';

export default class PtyManager {
  // ponytail: ptyLib param para tests sin module mocking
  constructor(ptyLib = null) {
    this._lib = ptyLib ?? ptyDefault;
    this.process = null;
    this.onOutput = null;
  }

  get running() {
    return this.process !== null;
  }

  spawn(command = 'claude', args = [], cwd = process.env.HOME) {
    this.process = this._lib.spawn(command, args, {
      name: 'xterm-256color',
      cols: 220,
      rows: 50,
      cwd,
      env: process.env,
    });
    this.process.onData((data) => {
      this.onOutput?.(data);
    });
  }

  write(text) {
    this.process?.write(text);
  }

  kill() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
