import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// Import storage functions from web directory
const { makeProject } = await import('../../../web/app/lib/storage.js');

test('makeProject creates project with correct default model and effort', () => {
  const p = makeProject('Test App');
  assert.equal(p.name, 'Test App');
  assert.equal(p.model, 'claude-sonnet-4-6');
  assert.equal(p.effort, 'medium');
});

test('makeProject includes all required base fields', () => {
  const p = makeProject('Test App');
  assert.ok(p.id, 'should have id');
  assert.equal(p.path, null);
  assert.equal(p.skipPermissions, true);
  assert.equal(p.spendLimit, 5.00);
  assert.ok(Array.isArray(p.messages));
  assert.equal(p.isNewStart, true);
  assert.ok(p.createdAt > 0, 'createdAt should be a timestamp');
});

test('makeProject includes CC Creator fields with correct defaults', () => {
  const p = makeProject('Mi App');
  assert.strictEqual(p.phase, 1, 'phase should default to 1');
  assert.strictEqual(p.stack, null, 'stack should default to null');
  assert.strictEqual(p.isNew, true, 'isNew should default to true');
  assert.strictEqual(p.githubRepo, null, 'githubRepo should default to null');
  assert.strictEqual(p.netlifyUrl, null, 'netlifyUrl should default to null');
  assert.strictEqual(p.supabaseProject, null, 'supabaseProject should default to null');
});

test('makeProject accepts custom id', () => {
  const p = makeProject('App', 'custom-id-123');
  assert.equal(p.id, 'custom-id-123');
});

test('makeProject generates unique ids when not provided', () => {
  const p1 = makeProject('App 1');
  const p2 = makeProject('App 2');
  assert.notEqual(p1.id, p2.id);
});

test('makeProject contains all expected fields', () => {
  const p = makeProject('Complete Test');
  const expectedFields = [
    'id', 'name', 'path', 'model', 'effort', 'skipPermissions', 'spendLimit',
    'phase', 'stack', 'isNew', 'githubRepo', 'netlifyUrl', 'supabaseProject',
    'createdAt', 'messages', 'isNewStart'
  ];
  expectedFields.forEach(field => {
    assert.ok(field in p, `project should have '${field}' field`);
  });
});
