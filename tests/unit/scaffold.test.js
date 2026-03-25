// tests/unit/scaffold.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldProject } from '../../src/utils/scaffold.js';

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'closedclawd-scaffold-'));
}

describe('scaffoldProject', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('creates generic scaffold with package.json', async () => {
    await scaffoldProject(dir, 'generic', 'my-app');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'my-app');
  });

  it('creates nextjs scaffold with next dependency', async () => {
    await scaffoldProject(dir, 'nextjs', 'my-saas');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies.next);
  });

  it('creates express-api scaffold with express dependency', async () => {
    await scaffoldProject(dir, 'express-api', 'my-api');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies.express);
  });

  it('creates src directory', async () => {
    await scaffoldProject(dir, 'generic', 'my-app');
    assert.ok(existsSync(join(dir, 'src')));
  });

  it('falls back to generic for unknown stack', async () => {
    await scaffoldProject(dir, 'unknown-stack', 'my-app');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'my-app');
  });
});
