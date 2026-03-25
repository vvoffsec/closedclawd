// src/create.js
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { scaffoldProject } from './utils/scaffold.js';
import { detectStack } from './utils/detect-stack.js';
import { runInit } from './init.js';

export function buildProjectName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function scaffoldPhase(parentDir, projectName, stack, flags = {}) {
  const projectDir = join(parentDir, projectName);

  if (existsSync(projectDir)) {
    throw new Error(`Directory already exists: ${projectDir}`);
  }

  mkdirSync(projectDir, { recursive: true });

  console.log(`\nScaffolding ${stack} project: ${projectName}`);
  await scaffoldProject(projectDir, stack, projectName);
  console.log('  Project structure created');

  if (!flags._skipGitInit) {
    execSync('git init', { cwd: projectDir, stdio: 'pipe' });
    console.log('  Initialized git repository');
  }

  if (!flags._skipNpmInstall) {
    console.log('  Installing dependencies (this may take a moment)...');
    try {
      execSync('npm install', { cwd: projectDir, stdio: 'pipe' });
      console.log('  Dependencies installed');
    } catch {
      console.log('  Warning: npm install failed. Retrying...');
      try {
        execSync('npm install', { cwd: projectDir, stdio: 'pipe' });
        console.log('  Dependencies installed (retry succeeded)');
      } catch {
        console.log('  Warning: npm install failed. Run manually in the project directory.');
      }
    }
  }

  if (!flags._skipClosedClawdInit) {
    console.log('  Injecting ClosedClawd orchestration...');
    await runInit(projectDir, { _skipRufloCheck: flags._skipRufloCheck || false });
  }

  if (!flags._skipGitInit) {
    try {
      execSync('git add -A && git commit -m "Initial scaffold from ClosedClawd"', {
        cwd: projectDir,
        stdio: 'pipe',
      });
      console.log('  Initial commit created');
    } catch {
      // May fail if git user not configured — non-fatal
    }
  }

  return projectDir;
}

export async function runCreate(flags = {}) {
  console.log('=== ClosedClawd Project Creator ===\n');
  console.log('This command walks you through an interactive brainstorm,');
  console.log('then autonomously scaffolds and builds your project using RuFlo.\n');
  console.log('Phase 1: Interactive Brainstorm');
  console.log('  The brainstorm runs inside your Claude Code session.');
  console.log('  Use the /autopilot-brainstorm skill or start a conversation with:');
  console.log('  "I want to build <your idea>"\n');
  console.log('Phase 2-5: After your spec is approved, run:');
  console.log('  closedclawd create --spec <path-to-spec.md>\n');

  if (flags.spec) {
    const specContent = readFileSync(flags.spec, 'utf8');

    const titleMatch = specContent.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : 'new-project';
    const projectName = buildProjectName(title);

    const stack = detectStack(specContent);
    console.log(`Detected stack: ${stack}`);
    console.log(`Project name: ${projectName}\n`);

    const parentDir = resolve(process.cwd(), '..');
    const projectDir = await scaffoldPhase(parentDir, projectName, stack);

    console.log(`\nProject created at: ${projectDir}`);
    console.log('\nPhase 4 (Swarm Execution) will be handled by RuFlo.');
    console.log(`cd ${projectDir} and start a Claude Code session to begin autonomous development.`);

    return projectDir;
  }
}
