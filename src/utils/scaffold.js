// src/utils/scaffold.js
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveScaffoldsDir() {
  return join(__dirname, '..', '..', 'scaffolds');
}

function applyTemplateVars(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function copyScaffoldDir(src, dest, vars) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyScaffoldDir(srcPath, destPath, vars);
    } else {
      let content = readFileSync(srcPath, 'utf8');
      content = applyTemplateVars(content, vars);
      writeFileSync(destPath, content);
    }
  }
}

export async function scaffoldProject(targetDir, stack, projectName) {
  const scaffoldsDir = resolveScaffoldsDir();
  let stackDir = join(scaffoldsDir, stack);

  if (!existsSync(stackDir)) {
    stackDir = join(scaffoldsDir, 'generic');
  }

  const vars = { PROJECT_NAME: projectName };
  copyScaffoldDir(stackDir, targetDir, vars);

  mkdirSync(join(targetDir, 'src'), { recursive: true });
  mkdirSync(join(targetDir, 'tests'), { recursive: true });
}
