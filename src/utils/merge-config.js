// src/utils/merge-config.js

// Servers owned by ClosedClawd — always updated on init
const OWNED_SERVERS = ['claude-flow', 'ruv-swarm', 'flow-nexus'];

export function mergeMcpJson(target, source) {
  const result = { mcpServers: { ...target.mcpServers } };

  for (const [name, config] of Object.entries(source.mcpServers || {})) {
    if (OWNED_SERVERS.includes(name)) {
      result.mcpServers[name] = config;
    } else if (!result.mcpServers[name]) {
      result.mcpServers[name] = config;
    }
  }

  return result;
}

function hookSignature(hookEntry) {
  const matcher = hookEntry.matcher || '*';
  const cmds = (hookEntry.hooks || []).map((h) => h.command || '').join('|');
  return `${matcher}::${cmds}`;
}

export function mergeSettings(target, source) {
  const result = { ...target };

  if (source.hooks) {
    result.hooks = result.hooks || {};
    for (const [event, sourceHooks] of Object.entries(source.hooks)) {
      const existing = result.hooks[event] || [];
      const existingSigs = new Set(existing.map(hookSignature));
      const deduped = sourceHooks.filter((h) => !existingSigs.has(hookSignature(h)));
      result.hooks[event] = [...existing, ...deduped];
    }
  }

  if (source.permissions) {
    result.permissions = result.permissions || {};
    result.permissions.allow = [
      ...new Set([...(result.permissions.allow || []), ...(source.permissions.allow || [])]),
    ];
    result.permissions.deny = [
      ...new Set([...(result.permissions.deny || []), ...(source.permissions.deny || [])]),
    ];
  }

  if (source.env) {
    result.env = result.env || {};
    for (const [key, val] of Object.entries(source.env)) {
      if (!(key in result.env)) {
        result.env[key] = val;
      }
    }
  }

  if (source.claudeFlow) {
    result.claudeFlow = source.claudeFlow;
  }

  for (const key of ['statusLine', 'attribution']) {
    if (source[key] && !result[key]) {
      result[key] = source[key];
    }
  }

  return result;
}

export function mergeCLAUDEmd(targetContent, sourceContent) {
  if (!targetContent || !targetContent.trim()) {
    return sourceContent;
  }

  const marker = '# Claude Code Configuration - RuFlo V3';
  if (targetContent.includes(marker)) {
    const markerIdx = targetContent.indexOf(marker);
    const before = targetContent.slice(0, markerIdx).trimEnd();
    return before ? `${before}\n\n${sourceContent}` : sourceContent;
  }

  return `${targetContent.trimEnd()}\n\n${sourceContent}`;
}
