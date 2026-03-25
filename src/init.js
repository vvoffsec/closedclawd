// src/init.js
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { mergeMcpJson, mergeSettings, mergeCLAUDEmd } from './utils/merge-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function resolveTemplatesDir() {
  return join(__dirname, '..', 'templates');
}

function checkRuflo() {
  try {
    execSync('ruflo --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

export async function runInit(targetDir, flags = {}) {
  const templatesDir = resolveTemplatesDir();

  // Pre-flight: check ruflo
  if (!flags._skipRufloCheck) {
    if (!checkRuflo()) {
      console.log('ClosedClawd requires RuFlo (ruflo).');
      console.log('Install it with: npm install -g ruflo');
      console.log('Then re-run: npx closedclawd init');
      process.exit(1);
    }
  }

  console.log('Initializing ClosedClawd...');

  // --- .mcp.json ---
  const mcpTarget = join(targetDir, '.mcp.json');
  const mcpSource = readJsonSafe(join(templatesDir, 'mcp.json'));
  if (existsSync(mcpTarget)) {
    const existing = readJsonSafe(mcpTarget);
    const merged = mergeMcpJson(existing, mcpSource);
    writeFileSync(mcpTarget, JSON.stringify(merged, null, 2) + '\n');
    console.log('  Merged .mcp.json (preserved existing servers)');
  } else {
    writeFileSync(mcpTarget, JSON.stringify(mcpSource, null, 2) + '\n');
    console.log('  Created .mcp.json');
  }

  // --- .claude/settings.json ---
  const settingsDir = join(targetDir, '.claude');
  mkdirSync(settingsDir, { recursive: true });
  const settingsTarget = join(settingsDir, 'settings.json');
  const settingsSource = readJsonSafe(join(templatesDir, 'claude', 'settings.json'));

  if (Object.keys(settingsSource).length > 0) {
    if (existsSync(settingsTarget)) {
      const existing = readJsonSafe(settingsTarget);
      const merged = mergeSettings(existing, settingsSource);
      writeFileSync(settingsTarget, JSON.stringify(merged, null, 2) + '\n');
      console.log('  Merged .claude/settings.json');
    } else {
      writeFileSync(settingsTarget, JSON.stringify(settingsSource, null, 2) + '\n');
      console.log('  Created .claude/settings.json');
    }
  }

  // --- CLAUDE.md ---
  const claudeTarget = join(targetDir, 'CLAUDE.md');
  const claudeSource = readFileSync(join(templatesDir, 'claude-md.md'), 'utf8');
  if (existsSync(claudeTarget)) {
    const existing = readFileSync(claudeTarget, 'utf8');
    const merged = mergeCLAUDEmd(existing, claudeSource);
    writeFileSync(claudeTarget, merged);
    console.log('  Merged CLAUDE.md');
  } else {
    writeFileSync(claudeTarget, claudeSource);
    console.log('  Created CLAUDE.md');
  }

  // --- .claude/agents/ ---
  const agentsSrc = join(templatesDir, 'claude', 'agents');
  const agentsDest = join(targetDir, '.claude', 'agents');
  if (existsSync(agentsSrc)) {
    cpSync(agentsSrc, agentsDest, { recursive: true, force: true });
    console.log('  Copied agent definitions');
  }

  // --- .claude/commands/ ---
  const commandsSrc = join(templatesDir, 'claude', 'commands');
  const commandsDest = join(targetDir, '.claude', 'commands');
  if (existsSync(commandsSrc)) {
    cpSync(commandsSrc, commandsDest, { recursive: true, force: true });
    console.log('  Copied command definitions');
  }

  // --- .claude/helpers/ ---
  const helpersSrc = join(templatesDir, 'claude', 'helpers');
  const helpersDest = join(targetDir, '.claude', 'helpers');
  mkdirSync(helpersDest, { recursive: true });
  if (existsSync(helpersSrc)) {
    cpSync(helpersSrc, helpersDest, { recursive: true, force: false });
    console.log('  Copied helpers (preserved existing)');
  }

  // --- .claude/skills/ ---
  const skillsSrc = join(templatesDir, 'claude', 'skills');
  const skillsDest = join(targetDir, '.claude', 'skills');
  if (existsSync(skillsSrc)) {
    cpSync(skillsSrc, skillsDest, { recursive: true, force: true });
    console.log('  Copied skills');
  }

  // --- plans/config.yaml ---
  const plansSrc = join(templatesDir, 'plans');
  const plansDest = join(targetDir, 'plans');
  mkdirSync(plansDest, { recursive: true });
  if (existsSync(join(plansSrc, 'config.yaml'))) {
    if (!existsSync(join(plansDest, 'config.yaml'))) {
      cpSync(join(plansSrc, 'config.yaml'), join(plansDest, 'config.yaml'));
      console.log('  Created plans/config.yaml');
    } else {
      console.log('  Skipped plans/config.yaml (already exists)');
    }
  }

  // Post-install verification
  if (!flags._skipRufloCheck) {
    console.log('\nVerifying RuFlo connectivity...');
    try {
      execSync('ruflo doctor --fix', { stdio: 'inherit', cwd: targetDir });
    } catch {
      console.log('  Warning: ruflo doctor failed. Run manually: ruflo doctor --fix');
    }
  }

  console.log('\nClosedClawd installed successfully.');
  console.log('Run `closedclawd create` to start a new autonomous project.');
}
