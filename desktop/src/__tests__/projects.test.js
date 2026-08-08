import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Override HOME to a temp dir for tests
const TEST_HOME = join(homedir(), '.cc-controller-test-' + Date.now());
process.env.HOME = TEST_HOME;
mkdirSync(join(TEST_HOME, '.config', 'cc-controller'), { recursive: true });
mkdirSync(join(TEST_HOME, 'CCProjects'), { recursive: true });

// Import AFTER setting HOME
const { createProject, listProjects, getActive, switchProject, deleteProject, saveProjectEnv } = await import('../projects.js');

test('createProject creates directory and returns project', () => {
  const p = createProject('test-1', 'My App');
  assert.equal(p.id, 'test-1');
  assert.equal(p.name, 'My App');
  assert.ok(p.path.includes('CCProjects'));
  assert.ok(existsSync(p.path));
});

test('createProject slugifies name', () => {
  const p = createProject('test-2', 'Hello World!!');
  assert.ok(p.path.endsWith('hello-world'));
});

test('createProject rejects path traversal', () => {
  assert.throws(() => createProject('test-3', '../../../etc'), /Invalid/);
});

test('listProjects returns all projects', () => {
  const list = listProjects();
  assert.ok(list.length >= 2);
});

test('switchProject changes active', () => {
  createProject('test-4', 'Other');
  switchProject('test-1');
  assert.equal(getActive().id, 'test-1');
});

test('switchProject rejects unknown id', () => {
  assert.throws(() => switchProject('nonexistent'), /not found/);
});

test('deleteProject removes from list', () => {
  deleteProject('test-4');
  assert.ok(!listProjects().find(p => p.id === 'test-4'));
});

test('saveProjectEnv creates .env with correct key-value pairs', () => {
  const p = createProject('test-env-1', 'Env App');
  saveProjectEnv('test-env-1', { GITHUB_TOKEN: 'ghp_12345', NETLIFY_AUTH_TOKEN: 'net_678' });
  const envPath = join(p.path, '.env');
  assert.ok(existsSync(envPath));
  const content = readFileSync(envPath, 'utf8');
  assert.ok(content.includes('GITHUB_TOKEN="ghp_12345"'));
  assert.ok(content.includes('NETLIFY_AUTH_TOKEN="net_678"'));
});

test('saveProjectEnv rejects nonexistent project id', () => {
  assert.throws(() => saveProjectEnv('nonexistent', { KEY: 'val' }), /not found/);
});

test('saveProjectEnv strips invalid key characters and skips empty keys', () => {
  const p = createProject('test-env-2', 'Env App 2');
  saveProjectEnv('test-env-2', { 'VALID_KEY': 'ok', '!!!': 'skip-empty', '': 'skip-empty' });
  const content = readFileSync(join(p.path, '.env'), 'utf8');
  assert.ok(content.includes('VALID_KEY="ok"'));
  assert.ok(!content.includes('skip-empty'));
});

// Cleanup
process.on('exit', () => rmSync(TEST_HOME, { recursive: true, force: true }));
