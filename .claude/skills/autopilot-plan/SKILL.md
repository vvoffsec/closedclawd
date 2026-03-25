---
name: "Autopilot Plan"
description: "Takes an approved design specification and produces a concrete implementation plan with file manifest, dependency graph, and context requirements. Used by /autopilot to convert specs into executable plans for agent swarms."
---

# Autopilot Plan

## Purpose

Convert an approved design spec into a detailed implementation plan that agent swarms can execute. The plan includes exact file paths, a dependency graph for context assembly, and ordered tasks.

## Input

The invoker must provide:
- **plan_id**: The plan ID (required)
- **plan_file**: Path to the plan file (required)
- **spec_path**: Path to the approved design spec (required)

## Process

### 1. Read the Design Spec

Read the spec file completely. Understand:
- What components need to be built
- What interfaces are defined
- What the testing strategy is
- What files are mentioned in the file manifest draft

### 2. Analyze the Existing Codebase

For each file the spec mentions modifying:
- Read the current file to understand what exists
- Identify the exact lines/sections that need to change
- Note imports, types, and dependencies the new code will need

For each new file the spec mentions creating:
- Identify where it fits in the existing directory structure
- Note what existing files it will import from or be imported by

### 3. Build the File Manifest with Dependency Graph

For each file in the plan, document:

```yaml
files_touched:
  - path: src/example/module.ts
    action: create|modify
    description: "What this file does or what changes"
    context_deps:
      - src/example/types.ts           # full file if < 300 lines
      - path: src/server.ts            # scoped if > 300 lines
        lines: 45-62
        reason: "middleware registration pattern"
```

The `context_deps` field is critical — it tells the Context Assembler what each agent needs to read (but not modify) to do its job correctly. Be generous: include anything that helps the agent understand the surrounding code.

### 4. Check Context Budget

Estimate the total context for each agent role:
- Sum the sizes of all files in `files_touched` + their `context_deps`
- If total exceeds 70% of context window (~700K tokens for 1M context): decompose into sub-plans
- Each sub-plan must be independently implementable and testable

If decomposition is needed:
- Create sub-plan files: `plans/<id>a-<slug>.md`, `plans/<id>b-<slug>.md`
- Set `depends_on` fields to order them correctly
- Each sub-plan gets its own file manifest

### 5. Write Ordered Implementation Tasks

Structure tasks following TDD (test-driven development):
1. Write failing tests for the component
2. Implement the minimal code to pass tests
3. Refactor for clarity

Each task must include:
- Exact file paths
- The actual code to write (complete, not pseudocode)
- The test commands to run
- Expected test output

### 6. Estimate Agent Requirements

Based on plan size:
- **Small plan** (1-3 files touched): 1 coder agent
- **Medium plan** (4-8 files touched): 2 coder agents (split by module)
- **Large plan** (9+ files touched): 3 coder agents (split by module) — or decompose

### 7. Update Plan File

Write the full implementation plan into the plan file's `## Implementation Plan` section.

Update frontmatter:
- Set `status` to `queued`
- Set `files_touched` to the list of all file paths
- Set `updated` to the current timestamp

## Output

Signal completion:
```
AUTOPILOT_PLAN_COMPLETE plan_id=<id> files_count=<n> agent_count=<n> status=queued
```

## Quality Rules

- Every file path must be exact and absolute relative to project root
- Every task must include complete code, not pseudocode or placeholders
- Context deps must be generous — err on more context, not less
- If a plan would require modifying more than 15 files, decompose it
- Test commands must be exact and runnable
