// tests/unit/create.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldPhase, buildProjectName } from '../../src/create.js';

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'closedclawd-create-'));
}

describe('buildProjectName', () => {
  it('converts spec title to kebab-case', () => {
    assert.equal(buildProjectName('SaaS Billing Dashboard'), 'saas-billing-dashboard');
  });

  it('strips special characters', () => {
    assert.equal(buildProjectName('My App (v2)!'), 'my-app-v2');
  });

  it('trims leading/trailing hyphens', () => {
    assert.equal(buildProjectName('  --hello world-- '), 'hello-world');
  });
});

describe('scaffoldPhase', () => {
  let parentDir;
  beforeEach(() => { parentDir = makeTempDir(); });
  afterEach(() => { rmSync(parentDir, { recursive: true, force: true }); });

  it('creates project in specified directory', async () => {
    const projectDir = await scaffoldPhase(parentDir, 'my-app', 'generic', { _skipNpmInstall: true, _skipGitInit: true, _skipClosedClawdInit: true });
    assert.ok(existsSync(projectDir));
    assert.ok(existsSync(join(projectDir, 'package.json')));
  });

  it('injects closedclawd config into scaffolded project', async () => {
    const projectDir = await scaffoldPhase(parentDir, 'my-app', 'generic', { _skipNpmInstall: true, _skipGitInit: true, _skipClosedClawdInit: false, _skipRufloCheck: true });
    assert.ok(existsSync(join(projectDir, '.mcp.json')));
    assert.ok(existsSync(join(projectDir, 'CLAUDE.md')));
  });
});
