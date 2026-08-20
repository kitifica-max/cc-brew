import { strict as assert } from 'node:assert';
import { test } from 'node:test';

// Import storage functions from web directory
const { makeProject, makeNode, makeVector, NODE_TYPES } = await import('../../../web/app/lib/storage.js');

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
  assert.ok(Array.isArray(p.nodes), 'nodes should be an array');
  assert.ok(Array.isArray(p.vectors), 'vectors should be an array');
  assert.equal(p.nodes.length, 0, 'nodes should be empty initially');
  assert.equal(p.vectors.length, 0, 'vectors should be empty initially');
  assert.ok(p.createdAt > 0, 'createdAt should be a timestamp');
});

test('makeProject contains all expected fields', () => {
  const p = makeProject('Complete Test');
  const expectedFields = [
    'id', 'name', 'path', 'model', 'effort', 'createdAt', 'nodes', 'vectors'
  ];
  expectedFields.forEach(field => {
    assert.ok(field in p, `project should have '${field}' field`);
  });
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

test('makeNode creates node with correct structure', () => {
  const n = makeNode('conversation', 10, 20);
  assert.ok(n.id, 'should have id');
  assert.equal(n.type, 'conversation');
  assert.equal(n.x, 10);
  assert.equal(n.y, 20);
  assert.equal(n.content, '');
  assert.equal(n.aiContent, '');
  assert.ok(n.createdAt > 0);
});

test('makeNode uses default values', () => {
  const n = makeNode();
  assert.equal(n.type, 'conversation');
  assert.equal(n.x, 0);
  assert.equal(n.y, 0);
});

test('makeVector creates vector with correct structure', () => {
  const v = makeVector('node-1', 'node-2', 'depends on');
  assert.ok(v.id, 'should have id');
  assert.equal(v.fromId, 'node-1');
  assert.equal(v.toId, 'node-2');
  assert.equal(v.label, 'depends on');
});

test('makeVector uses default label', () => {
  const v = makeVector('node-1', 'node-2');
  assert.equal(v.label, '');
});

test('NODE_TYPES contains valid types', () => {
  assert.deepEqual(NODE_TYPES, ['conversation', 'reference', 'definition', 'process']);
});
