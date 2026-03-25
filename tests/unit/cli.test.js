// tests/unit/cli.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../../src/cli.js';

describe('CLI', () => {
  it('parses "init" command', () => {
    const result = parseCommand(['init']);
    assert.equal(result.command, 'init');
  });

  it('parses "create" command', () => {
    const result = parseCommand(['create']);
    assert.equal(result.command, 'create');
  });

  it('parses "create" with --path flag', () => {
    const result = parseCommand(['create', '--path', '/tmp/myapp']);
    assert.equal(result.command, 'create');
    assert.equal(result.flags.path, '/tmp/myapp');
  });

  it('parses "create" with --spec flag', () => {
    const result = parseCommand(['create', '--spec', 'spec.md']);
    assert.equal(result.command, 'create');
    assert.equal(result.flags.spec, 'spec.md');
  });

  it('shows help for unknown command', () => {
    const result = parseCommand(['unknown']);
    assert.equal(result.command, 'help');
  });

  it('shows help when no args', () => {
    const result = parseCommand([]);
    assert.equal(result.command, 'help');
  });
});
