import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Override HOME to a temp dir for tests
const TEST_HOME = join(homedir(), '.cc-controller-test-' + Date.now());
process.env.HOME = TEST_HOME;
mkdirSync(join(TEST_HOME, '.config', 'cc-controller'), { recursive: true });
mkdirSync(join(TEST_HOME, 'CCProjects'), { recursive: true });

// Import AFTER setting HOME
const { createProject, listProjects, getActive, switchProject, deleteProject } = await import('../projects.js');

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

// Cleanup
process.on('exit', () => rmSync(TEST_HOME, { recursive: true, force: true }));
