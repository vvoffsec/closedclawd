// tests/unit/merge-config.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMcpJson, mergeSettings, mergeCLAUDEmd } from '../../src/utils/merge-config.js';

describe('mergeMcpJson', () => {
  it('returns source when target is empty', () => {
    const source = { mcpServers: { 'claude-flow': { command: 'ruflo' } } };
    const result = mergeMcpJson({}, source);
    assert.deepEqual(result, source);
  });

  it('adds closedclawd servers alongside existing', () => {
    const target = { mcpServers: { 'my-server': { command: 'my-cmd' } } };
    const source = { mcpServers: { 'claude-flow': { command: 'ruflo' } } };
    const result = mergeMcpJson(target, source);
    assert.ok(result.mcpServers['my-server']);
    assert.ok(result.mcpServers['claude-flow']);
  });

  it('does not overwrite existing user servers', () => {
    const target = { mcpServers: { 'my-server': { command: 'original' } } };
    const source = { mcpServers: { 'my-server': { command: 'replaced' } } };
    const result = mergeMcpJson(target, source);
    assert.equal(result.mcpServers['my-server'].command, 'original');
  });

  it('updates closedclawd-owned servers (claude-flow, ruv-swarm, flow-nexus)', () => {
    const target = { mcpServers: { 'claude-flow': { command: 'old' } } };
    const source = { mcpServers: { 'claude-flow': { command: 'ruflo' } } };
    const result = mergeMcpJson(target, source);
    assert.equal(result.mcpServers['claude-flow'].command, 'ruflo');
  });
});

describe('mergeSettings', () => {
  it('concatenates hook arrays', () => {
    const target = { hooks: { PreToolUse: [{ matcher: 'A' }] } };
    const source = { hooks: { PreToolUse: [{ matcher: 'B' }] } };
    const result = mergeSettings(target, source);
    assert.equal(result.hooks.PreToolUse.length, 2);
  });

  it('deduplicates hooks with same matcher and command', () => {
    const hook = { matcher: 'Bash', hooks: [{ command: 'same-cmd' }] };
    const target = { hooks: { PreToolUse: [hook] } };
    const source = { hooks: { PreToolUse: [hook] } };
    const result = mergeSettings(target, source);
    assert.equal(result.hooks.PreToolUse.length, 1);
  });

  it('merges permissions as union', () => {
    const target = { permissions: { allow: ['a'], deny: ['x'] } };
    const source = { permissions: { allow: ['b'], deny: ['y'] } };
    const result = mergeSettings(target, source);
    assert.deepEqual(result.permissions.allow, ['a', 'b']);
    assert.deepEqual(result.permissions.deny, ['x', 'y']);
  });

  it('sets env vars only if key absent', () => {
    const target = { env: { EXISTING: 'keep' } };
    const source = { env: { EXISTING: 'overwrite', NEW: 'add' } };
    const result = mergeSettings(target, source);
    assert.equal(result.env.EXISTING, 'keep');
    assert.equal(result.env.NEW, 'add');
  });

  it('writes claudeFlow config fresh', () => {
    const target = { claudeFlow: { version: '2.0.0' } };
    const source = { claudeFlow: { version: '3.0.0', swarm: {} } };
    const result = mergeSettings(target, source);
    assert.equal(result.claudeFlow.version, '3.0.0');
  });
});

describe('mergeCLAUDEmd', () => {
  it('appends to existing content', () => {
    const result = mergeCLAUDEmd('# Existing\nRules here', '# ClosedClawd\nNew rules');
    assert.ok(result.includes('# Existing'));
    assert.ok(result.includes('# ClosedClawd'));
  });

  it('returns source when target is empty', () => {
    const result = mergeCLAUDEmd('', '# ClosedClawd\nNew rules');
    assert.equal(result, '# ClosedClawd\nNew rules');
  });

  it('does not duplicate if closedclawd section already present', () => {
    const existing = '# Existing\n\n# Claude Code Configuration - RuFlo V3\nstuff';
    const source = '# Claude Code Configuration - RuFlo V3\nnew stuff';
    const result = mergeCLAUDEmd(existing, source);
    const matches = result.match(/Claude Code Configuration - RuFlo V3/g);
    assert.equal(matches.length, 1);
  });
});
