// tests/unit/init.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInit } from '../../src/init.js';

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'closedclawd-test-'));
}

describe('runInit — fresh project', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('copies .mcp.json to target', async () => {
    await runInit(dir, { _skipRufloCheck: true });
    assert.ok(existsSync(join(dir, '.mcp.json')));
  });

  it('copies CLAUDE.md to target', async () => {
    await runInit(dir, { _skipRufloCheck: true });
    assert.ok(existsSync(join(dir, 'CLAUDE.md')));
  });

  it('copies .claude/helpers to target', async () => {
    await runInit(dir, { _skipRufloCheck: true });
    assert.ok(existsSync(join(dir, '.claude', 'helpers')));
  });

  it('copies plans/config.yaml to target', async () => {
    await runInit(dir, { _skipRufloCheck: true });
    assert.ok(existsSync(join(dir, 'plans', 'config.yaml')));
  });
});

describe('runInit — existing config (merge)', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('preserves existing MCP servers when merging', async () => {
    const existing = { mcpServers: { 'my-server': { command: 'my-cmd' } } };
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify(existing));

    await runInit(dir, { _skipRufloCheck: true });

    const result = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
    assert.ok(result.mcpServers['my-server']);
    assert.ok(result.mcpServers['claude-flow']);
  });

  it('appends to existing CLAUDE.md', async () => {
    writeFileSync(join(dir, 'CLAUDE.md'), '# My Project\nCustom rules');

    await runInit(dir, { _skipRufloCheck: true });

    const content = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('RuFlo'));
  });
});
