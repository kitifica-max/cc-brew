import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createFileAuthStorage, hasStoredSession, AUTH_STORAGE_KEY } from '../auth-store.js';

test('file auth storage persists, reads and removes the session', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-auth-'));
  const storage = createFileAuthStorage(dir);

  assert.equal(storage.getItem(AUTH_STORAGE_KEY), null);
  assert.equal(hasStoredSession(dir), false);

  storage.setItem(AUTH_STORAGE_KEY, '{"refresh_token":"r1"}');
  assert.equal(storage.getItem(AUTH_STORAGE_KEY), '{"refresh_token":"r1"}');
  assert.equal(hasStoredSession(dir), true);

  storage.removeItem(AUTH_STORAGE_KEY);
  assert.equal(hasStoredSession(dir), false);
});

test('session file is not world readable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-auth-'));
  createFileAuthStorage(dir).setItem(AUTH_STORAGE_KEY, 'x');
  assert.equal(statSync(join(dir, 'auth.json')).mode & 0o077, 0);
});
