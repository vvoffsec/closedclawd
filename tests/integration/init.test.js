// tests/integration/init.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInit } from '../../src/init.js';

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'closedclawd-int-'));
}

describe('Integration: closedclawd init (fresh project)', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('creates complete ClosedClawd setup', async () => {
    await runInit(dir, { _skipRufloCheck: true });

    // Verify all expected files exist
    assert.ok(existsSync(join(dir, '.mcp.json')), '.mcp.json missing');
    assert.ok(existsSync(join(dir, 'CLAUDE.md')), 'CLAUDE.md missing');
    assert.ok(existsSync(join(dir, '.claude', 'agents')), '.claude/agents missing');
    assert.ok(existsSync(join(dir, '.claude', 'commands')), '.claude/commands missing');
    assert.ok(existsSync(join(dir, '.claude', 'helpers')), '.claude/helpers missing');
    assert.ok(existsSync(join(dir, 'plans', 'config.yaml')), 'plans/config.yaml missing');

    // Verify MCP points to ruflo
    const mcp = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
    assert.ok(mcp.mcpServers['claude-flow']);
    assert.equal(mcp.mcpServers['claude-flow'].command, 'ruflo');

    // Verify CLAUDE.md has ClosedClawd content
    const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.includes('RuFlo'));
  });
});

describe('Integration: closedclawd init (existing project)', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('merges without destroying existing config', async () => {
    // Setup existing project
    const existingMcp = {
      mcpServers: {
        'postgres': { command: 'pg-mcp', args: ['start'] },
      },
    };
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify(existingMcp));
    writeFileSync(join(dir, 'CLAUDE.md'), '# My Awesome Project\n\nDo not delete this.');

    await runInit(dir, { _skipRufloCheck: true });

    // Verify user's MCP server preserved
    const mcp = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
    assert.ok(mcp.mcpServers['postgres'], 'User postgres server was deleted');
    assert.equal(mcp.mcpServers['postgres'].command, 'pg-mcp');

    // Verify ClosedClawd servers added
    assert.ok(mcp.mcpServers['claude-flow']);

    // Verify CLAUDE.md merged
    const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.includes('My Awesome Project'), 'Original content deleted');
    assert.ok(claude.includes('RuFlo'), 'ClosedClawd content not added');
  });
});
