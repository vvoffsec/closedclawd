#!/usr/bin/env bash
# scripts/sync-templates.sh
# Copies current .claude/ assets into templates/ for npm distribution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo "Syncing .claude/ assets to templates/..."

# Preserve hand-crafted files, clean generated ones
SETTINGS_BAK=""
if [ -f "$ROOT/templates/claude/settings.json" ]; then
  SETTINGS_BAK="$(mktemp)"
  cp "$ROOT/templates/claude/settings.json" "$SETTINGS_BAK"
fi

rm -rf "$ROOT/templates/claude"
mkdir -p "$ROOT/templates/claude"

# Restore preserved files
if [ -n "$SETTINGS_BAK" ] && [ -f "$SETTINGS_BAK" ]; then
  cp "$SETTINGS_BAK" "$ROOT/templates/claude/settings.json"
  rm "$SETTINGS_BAK"
  echo "  Preserved settings.json"
fi

# Copy agent definitions
if [ -d "$ROOT/.claude/agents" ]; then
  cp -r "$ROOT/.claude/agents" "$ROOT/templates/claude/agents"
  echo "  Copied agents/ ($(find "$ROOT/.claude/agents" -name '*.md' | wc -l) files)"
fi

# Copy command definitions
if [ -d "$ROOT/.claude/commands" ]; then
  cp -r "$ROOT/.claude/commands" "$ROOT/templates/claude/commands"
  echo "  Copied commands/ ($(find "$ROOT/.claude/commands" -name '*.md' | wc -l) files)"
fi

# Copy helpers (JS files only, not settings)
if [ -d "$ROOT/.claude/helpers" ]; then
  mkdir -p "$ROOT/templates/claude/helpers"
  cp "$ROOT/.claude/helpers"/*.js "$ROOT/templates/claude/helpers/" 2>/dev/null || true
  cp "$ROOT/.claude/helpers"/*.cjs "$ROOT/templates/claude/helpers/" 2>/dev/null || true
  cp "$ROOT/.claude/helpers"/*.mjs "$ROOT/templates/claude/helpers/" 2>/dev/null || true
  echo "  Copied helpers/"
fi

# Copy skills
if [ -d "$ROOT/.claude/skills" ]; then
  cp -r "$ROOT/.claude/skills" "$ROOT/templates/claude/skills"
  echo "  Copied skills/"
fi

# Copy CLAUDE.md
cp "$ROOT/CLAUDE.md" "$ROOT/templates/claude-md.md"
echo "  Copied claude-md.md"

# Copy plans config
mkdir -p "$ROOT/templates/plans"
if [ -f "$ROOT/plans/config.yaml" ]; then
  cp "$ROOT/plans/config.yaml" "$ROOT/templates/plans/config.yaml"
  echo "  Copied plans/config.yaml"
fi

echo "Sync complete."
