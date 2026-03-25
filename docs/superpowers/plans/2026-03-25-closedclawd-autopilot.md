# ClosedClawd Autopilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-skill pipeline that turns high-level goals into PRs through autonomous agent swarms with context-managed isolation.

**Architecture:** Five Claude Code skills forming a pipeline: orchestrator -> brainstorm -> plan -> execute -> merge. The orchestrator stays lean in the main context window, dispatching each phase as an agent with a clean context. RuFlo MCP handles swarm coordination, memory-based file claims, and task tracking. Git worktrees provide isolation per plan.

**Tech Stack:** Claude Code skills (YAML+Markdown), RuFlo/claude-flow MCP, Git worktrees, `gh` CLI for PR creation

---

## File Structure

```
.claude/skills/autopilot/SKILL.md              # /autopilot — orchestrator
.claude/skills/autopilot-brainstorm/SKILL.md    # /autopilot-brainstorm — goal to spec
.claude/skills/autopilot-plan/SKILL.md          # /autopilot-plan — spec to plan
.claude/skills/autopilot-execute/SKILL.md       # /autopilot-execute — plan to code
.claude/skills/autopilot-merge/SKILL.md         # /autopilot-merge — code to PR
plans/config.yaml                                # default autopilot settings
plans/.gitkeep                                   # ensure plans/ exists in repo
.gitignore (update)                              # add .worktrees/
```

Each skill is a standalone SKILL.md file following Claude Code's skill specification: YAML frontmatter with `name` and `description`, followed by instructions that Claude follows when the skill is invoked.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `plans/config.yaml`
- Create: `plans/.gitkeep`
- Modify: `.gitignore` (create if not exists)

- [ ] **Step 1: Create plans directory with config.yaml**

```yaml
# plans/config.yaml
defaults:
  approval:
    spec: pending      # brainstorm output needs user review
    plan: auto         # plans auto-approved after spec approval
    merge: never       # always create PR, never auto-merge
  priority: 5          # default priority (1-10, lower = higher)
  max_parallel_swarms: 3
  max_attempts: 3
  context_soft_limit: 0.5   # 50% of context window
  context_hard_limit: 0.7   # 70% of context window
  claim_ttl: 3600           # 1 hour, auto-release if swarm dies
```

- [ ] **Step 2: Create plans/.gitkeep**

Empty file to ensure the `plans/` directory is tracked by git.

- [ ] **Step 3: Update .gitignore**

Add these entries to `.gitignore` (create the file if it doesn't exist):

```gitignore
# Autopilot worktrees (transient, per-plan isolation)
.worktrees/

# Auto-generated queue file (rebuilt from plan file frontmatter)
plans/queue.md
```

- [ ] **Step 4: Verify directory structure**

Run:
```bash
ls -la plans/
cat plans/config.yaml
cat .gitignore
```

Expected: `config.yaml` and `.gitkeep` exist in `plans/`, `.gitignore` contains `.worktrees/` entry.

- [ ] **Step 5: Commit**

```bash
git add plans/config.yaml plans/.gitkeep .gitignore
git commit -m "feat: scaffold autopilot plan infrastructure"
```

---

### Task 2: /autopilot-brainstorm Skill

**Files:**
- Create: `.claude/skills/autopilot-brainstorm/SKILL.md`

This skill takes a high-level goal and produces a design specification through structured brainstorming. It's invoked by the orchestrator as a dispatched agent with a clean context.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/autopilot-brainstorm
```

- [ ] **Step 2: Write the SKILL.md file**

```markdown
---
name: "Autopilot Brainstorm"
description: "Takes a high-level goal and produces a detailed design specification through structured brainstorming. Used by /autopilot to convert user goals into actionable specs. Invoke directly with /autopilot-brainstorm or let the orchestrator dispatch it."
---

# Autopilot Brainstorm

## Purpose

Convert a high-level goal into a detailed design specification. This skill runs in a clean context window — it receives only the goal text and relevant codebase context, nothing else.

## Input

The invoker must provide:
- **goal**: The high-level goal text (required)
- **plan_id**: The plan ID assigned by the orchestrator (required)
- **plan_file**: Path to the plan file (required)
- **autonomous**: Whether to proceed without user interaction (default: false)

These are passed as context in the agent's prompt when dispatched.

## Process

### 1. Understand the Codebase Context

Before brainstorming, read the project structure to understand what exists:
- Read CLAUDE.md for project conventions
- Use Glob to scan `src/` for existing modules
- Use Grep to find patterns related to the goal
- Read any existing specs in `docs/superpowers/specs/` that might be related

### 2. Brainstorm the Design

If **autonomous is false** (user is present):
- Ask clarifying questions one at a time (prefer multiple choice)
- Explore 2-3 approaches with trade-offs
- Present recommended approach with reasoning
- Get user approval on each design section

If **autonomous is true** (user is away):
- Make reasonable assumptions based on codebase patterns
- Choose the approach that best fits existing conventions
- Document all assumptions explicitly in the spec
- Flag any decisions that the user should review

### 3. Write the Design Spec

Save to: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

The spec must include:
- **Overview**: What this builds and why
- **Architecture**: Components, their responsibilities, how they interact
- **Data flow**: How data moves through the system
- **API/Interface contracts**: Typed interfaces for all public APIs
- **Error handling**: What can go wrong and how each case is handled
- **Testing strategy**: What to test, acceptance criteria
- **File manifest draft**: Initial list of files that will be created/modified

### 4. Update Plan File

After writing the spec:

```yaml
# Update the plan file frontmatter:
status: spec-review    # if autonomous, awaiting user review
# OR
status: planning       # if user approved interactively
spec: docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
updated: <current timestamp>
```

### 5. Self-Review the Spec

Before finishing:
1. **Placeholder scan**: No TBDs, TODOs, or vague requirements
2. **Internal consistency**: Architecture matches feature descriptions
3. **Scope check**: Is this one plan or does it need decomposition?
4. **Ambiguity check**: Could any requirement be interpreted two ways? Pick one.

Fix issues inline. Do not ask for re-review — just fix and move on.

## Output

Signal completion by updating the plan file status and printing:
```
AUTOPILOT_BRAINSTORM_COMPLETE plan_id=<id> spec=<path> status=<spec-review|planning>
```

## Quality Rules

- Never produce a spec with placeholder sections
- Every component must have a clear responsibility
- Every interface must have typed contracts
- Every error case must have a defined handling strategy
- If the goal is too vague to produce a quality spec, flag it and request clarification rather than guessing
```

- [ ] **Step 3: Verify skill file**

Run:
```bash
cat .claude/skills/autopilot-brainstorm/SKILL.md | head -5
```

Expected: YAML frontmatter with `name: "Autopilot Brainstorm"` and `description`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/autopilot-brainstorm/SKILL.md
git commit -m "feat: add /autopilot-brainstorm skill — goal to design spec"
```

---

### Task 3: /autopilot-plan Skill

**Files:**
- Create: `.claude/skills/autopilot-plan/SKILL.md`

This skill takes an approved design spec and produces a concrete implementation plan with a file manifest and dependency graph.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/autopilot-plan
```

- [ ] **Step 2: Write the SKILL.md file**

```markdown
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

```yaml
status: queued
files_touched:
  - <list of all file paths>
updated: <current timestamp>
```

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
```

- [ ] **Step 3: Verify skill file**

Run:
```bash
cat .claude/skills/autopilot-plan/SKILL.md | head -5
```

Expected: YAML frontmatter with `name: "Autopilot Plan"`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/autopilot-plan/SKILL.md
git commit -m "feat: add /autopilot-plan skill — spec to implementation plan"
```

---

### Task 4: /autopilot-execute Skill

**Files:**
- Create: `.claude/skills/autopilot-execute/SKILL.md`

This skill takes an implementation plan and executes it via a hierarchical agent swarm in an isolated git worktree. This is the largest and most complex skill.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/autopilot-execute
```

- [ ] **Step 2: Write the SKILL.md file**

```markdown
---
name: "Autopilot Execute"
description: "Executes an implementation plan by dispatching a hierarchical agent swarm in an isolated git worktree. Runs the full quality pipeline: TDD, implementation, simplification, code review, security scan, doc cleanup, and verification. Used by /autopilot to turn plans into working code."
---

# Autopilot Execute

## Purpose

Take an implementation plan and produce working, tested, reviewed, secure code in an isolated git worktree branch. This skill orchestrates a swarm of specialized agents, each with a purpose-built context window.

## Input

The invoker must provide:
- **plan_id**: The plan ID (required)
- **plan_file**: Path to the plan file (required)
- **branch_name**: Git branch name, e.g. `autopilot/001-auth-system` (required)
- **worktree_path**: Path for the worktree, e.g. `.worktrees/001-auth-system` (required)
- **previous_error**: Error from a prior failed attempt, if this is a retry (optional)

## Process

### 1. Set Up Worktree

```bash
# Create worktree from current main
git worktree add <worktree_path> -b <branch_name> main
```

If the branch already exists (retry scenario):
```bash
git worktree add <worktree_path> <branch_name>
```

All subsequent work happens inside the worktree directory.

### 2. Read the Implementation Plan

Read the plan file's `## Implementation Plan` section. Parse:
- Ordered tasks
- File manifest with context deps
- Test strategy
- Agent count estimate

### 3. Assemble Agent Contexts

For each agent role, build a context document containing only what that agent needs:

**TDD Agent context:**
- Plan's test strategy section
- API/interface contracts from the spec
- Existing test files in the project (for style reference)
- Related type definition files
- Project test conventions (from CLAUDE.md)

**Coder Agent context:**
- Plan's implementation tasks (only the tasks assigned to this agent)
- Test skeletons written by the TDD agent
- Full content of every file being modified
- Full content of every context_dep file (full file if < 300 lines, scoped lines if larger)
- Architecture notes from the spec
- Project conventions (CLAUDE.md, tsconfig, .editorconfig)
- If retry: specific feedback from the prior review cycle (not full history)

**Simplifier Agent context:**
- All files changed by the Coder agents
- Project coding conventions
- Existing code in the same modules (for consistency reference)

**Reviewer Agent context:**
- All files changed (post-simplification)
- Plan's acceptance criteria
- Test results from the test run
- Project conventions
- Related code in the same modules

**Security Agent context:**
- All files changed
- Dependency list (package.json / requirements.txt)
- OWASP top 10 checklist
- Project security rules (from CLAUDE.md)

**Doc Agent context:**
- All files changed that contain comments or documentation
- Project documentation conventions
- Existing docs for style reference

**Verifier Agent context:**
- Test output (full)
- Build output (full)
- Plan's definition of done / acceptance criteria
- Coverage report if available
- Plan summary

### 4. Execute Quality Pipeline

Run agents sequentially. Each agent is dispatched via Claude Code's Agent tool with `run_in_background: true`.

**Phase 1 — TDD Setup:**
Dispatch TDD agent. It writes test skeletons for all components in the plan. Tests should fail (no implementation yet).

Run tests to confirm they fail:
```bash
npm test 2>&1 | tail -20
```

**Phase 2 — Implementation:**
Dispatch Coder agent(s). If multiple coders, each gets a non-overlapping subset of tasks.

After all coders complete, run tests:
```bash
npm test 2>&1
```

**Phase 3 — Simplification:**
Dispatch Simplifier agent with the `simplify` skill. It reviews all changed files for:
- Code reuse opportunities
- Unnecessary complexity
- AI-generated patterns that should be cleaned up

**Phase 4 — Code Review:**
Dispatch Reviewer agent with the `superpowers:requesting-code-review` skill.

If the reviewer flags issues:
- Collect the feedback
- Re-dispatch Coder agent with the feedback in context
- Repeat phases 2-4 (max 3 review cycles)

**Phase 5 — Security Scan:**
Dispatch Security agent. It checks for:
- OWASP top 10 vulnerabilities
- Hardcoded secrets or credentials
- Input validation at system boundaries
- SQL injection, XSS, command injection patterns

If critical issues found: loop back to Phase 2 with security feedback.

**Phase 6 — Doc Cleanup:**
Dispatch Doc agent with the `humanizer` skill. It cleans up any AI-generated comments or documentation to sound natural.

**Phase 7 — Verification:**
Dispatch Verifier agent with the `superpowers:verification-before-completion` skill.

The verifier:
1. Runs the full test suite: `npm test`
2. Runs the build: `npm run build`
3. Checks that all acceptance criteria from the plan are met
4. Confirms no regressions in existing tests

If verification fails:
- Dispatch debugging agent with `superpowers:systematic-debugging`
- Loop back to Phase 2 (max 3 debug cycles)

### 5. Commit Results

After all phases pass:

```bash
cd <worktree_path>
git add -A
git commit -m "feat(<plan_slug>): implement <plan_title>

Automated implementation by ClosedClawd Autopilot.
Plan: <plan_id>
Spec: <spec_path>

Quality pipeline: TDD -> Implementation -> Simplification -> Code Review -> Security -> Docs -> Verification
All tests passing. Build successful."
```

### 6. Update Plan File

```yaml
status: reviewing
swarm_id: <swarm_id>
updated: <current timestamp>
```

Append to `## Execution Log`:
- Which agents ran and what they did
- Number of review/debug cycles
- Test results summary
- Any notable decisions or assumptions

## Output

Signal completion:
```
AUTOPILOT_EXECUTE_COMPLETE plan_id=<id> branch=<branch> worktree=<path> status=reviewing
```

If all retries exhausted:
```
AUTOPILOT_EXECUTE_FAILED plan_id=<id> error="<description>" attempts=<n>
```

## Failure Handling

- If any phase fails and retries are exhausted within this execution, report failure
- Include the full error context so the orchestrator can pass it to the next attempt
- Do NOT delete the worktree on failure — leave it for debugging
- Do NOT force-push, reset, or discard work

## Quality Rules

- Every agent gets a clean context — no leaking state between agents
- Context assembly is generous — include more rather than less
- Never skip phases — even if the code "looks fine", run the full pipeline
- All tests must pass before signaling completion
- Build must succeed before signaling completion
- Never commit secrets, credentials, or .env files
```

- [ ] **Step 3: Verify skill file**

Run:
```bash
cat .claude/skills/autopilot-execute/SKILL.md | head -5
```

Expected: YAML frontmatter with `name: "Autopilot Execute"`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/autopilot-execute/SKILL.md
git commit -m "feat: add /autopilot-execute skill — plan to code via agent swarm"
```

---

### Task 5: /autopilot-merge Skill

**Files:**
- Create: `.claude/skills/autopilot-merge/SKILL.md`

This skill takes a completed worktree branch and creates a pull request. It handles rebasing, conflict resolution, and PR creation. It never merges to main.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/autopilot-merge
```

- [ ] **Step 2: Write the SKILL.md file**

```markdown
---
name: "Autopilot Merge"
description: "Takes a completed worktree branch from /autopilot-execute and creates a pull request. Handles rebasing onto main, auto-resolving conflicts where possible, and creating detailed PRs. Never merges to main — the user controls what lands."
---

# Autopilot Merge

## Purpose

Take a completed implementation branch and produce a pull request. Handle conflicts intelligently. Never merge to main.

## Input

The invoker must provide:
- **plan_id**: The plan ID (required)
- **plan_file**: Path to the plan file (required)
- **branch_name**: The git branch with completed work (required)
- **worktree_path**: Path to the worktree (required)
- **spec_path**: Path to the design spec (required)

## Process

### 1. Verify Branch State

```bash
cd <worktree_path>
git status
npm test
npm run build
```

If tests fail or build fails, signal failure — do not create a PR for broken code.

### 2. Rebase onto Main

```bash
cd <worktree_path>
git fetch origin main
git rebase origin/main
```

**If rebase is clean:** proceed to step 3.

**If rebase has conflicts:** attempt auto-resolution (step 2a).

### 2a. Conflict Resolution

For each conflicting file:

1. Read both versions (ours and theirs)
2. Read the plan file to understand the intent of our changes
3. Read the git log of main to understand what changed upstream
4. Resolve the conflict preserving both changes' intent
5. Stage the resolved file

After resolving all conflicts:

```bash
git rebase --continue
npm test
npm run build
```

If tests pass after resolution: proceed to step 3.

If tests fail after resolution or conflicts can't be resolved:
- Abort the rebase: `git rebase --abort`
- Create a draft PR instead (step 3 with `--draft` flag)
- Add conflict notes to the PR body

### 3. Push and Create PR

```bash
cd <worktree_path>
git push -u origin <branch_name>
```

Read the plan file to extract:
- Plan title and goal
- Execution log summary
- Test results
- Security scan results
- Spec path

Create the PR:

```bash
gh pr create \
  --title "autopilot/<plan_id>: <plan_title>" \
  --body "$(cat <<'EOF'
## Summary

**Plan:** <plan_id> — <plan_title>
**Goal:** <goal text>
**Spec:** [Design Spec](<spec_path>)

## What Changed

<Summary of changes from execution log>

## Quality Pipeline Results

- TDD: <pass/fail>
- Code Review: <pass/fail, number of cycles>
- Security Scan: <pass/fail>
- Verification: <pass/fail>
- All Tests: <pass/fail>
- Build: <pass/fail>

## Files Changed

<list of files from file manifest>

---
Generated by ClosedClawd Autopilot
EOF
)"
```

If conflicts couldn't be resolved, add `--draft` flag and append to body:

```
## Merge Conflicts

The following files have unresolved conflicts with main:
- <list of conflicting files>

Please resolve manually before merging.
```

### 4. Update Plan File

```yaml
status: pr-created
pr_url: <url from gh pr create>
updated: <current timestamp>
```

Append to `## Merge Notes`:
- Whether rebase was clean or had conflicts
- How conflicts were resolved (if any)
- PR URL

### 5. Cleanup Worktree

```bash
git worktree remove <worktree_path>
```

If the worktree can't be removed (locked), just note it — the orchestrator will clean up later.

## Output

Signal completion:
```
AUTOPILOT_MERGE_COMPLETE plan_id=<id> pr_url=<url> status=pr-created draft=<true|false>
```

## Quality Rules

- NEVER merge to main. NEVER. Only create PRs.
- NEVER create a PR for code with failing tests or broken build
- NEVER force-push or rewrite history on shared branches
- Always include full quality pipeline results in the PR body
- Draft PRs for unresolved conflicts — don't pretend they're ready
```

- [ ] **Step 3: Verify skill file**

Run:
```bash
cat .claude/skills/autopilot-merge/SKILL.md | head -5
```

Expected: YAML frontmatter with `name: "Autopilot Merge"`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/autopilot-merge/SKILL.md
git commit -m "feat: add /autopilot-merge skill — completed code to PR"
```

---

### Task 6: /autopilot Orchestrator Skill

**Files:**
- Create: `.claude/skills/autopilot/SKILL.md`

This is the main entry point — the orchestrator loop. It maintains the goal queue, dispatches phases as agents, manages file claims, tracks parallelism, and handles user interaction. It must stay lean.

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p .claude/skills/autopilot
```

- [ ] **Step 2: Write the SKILL.md file**

```markdown
---
name: "Autopilot"
description: "Continuous autonomous development orchestrator. Turns high-level goals into PRs through agent swarms. Manages goal queue, dispatches brainstorm/plan/execute/merge phases, tracks parallel swarms, handles file claims and conflict avoidance. Invoke with /autopilot to start the loop."
---

# Autopilot — Orchestrator

## Purpose

You are the ClosedClawd Autopilot orchestrator. You run in the main context window and stay lean. You dispatch work to agents with clean contexts — you never implement code, write tests, or read source files yourself.

Your job: manage the goal queue, dispatch the right skill at the right time, track progress, handle user interaction, and ensure plans don't collide.

## Startup

When invoked, announce:

```
ClosedClawd Autopilot active.
Commands: status | approve <id> | reject <id> — <reason> | pause | resume | priority <id> <n> | add goal: <text> | config
```

Then:
1. Read `plans/config.yaml` for default settings
2. Scan `plans/*.md` for existing plan files — parse their frontmatter to build the current state
3. Check for any pending approvals and present them
4. Begin the orchestration loop

## The Orchestration Loop

```
LOOP:
  1. Scan plan files for state changes
  2. Process user commands (if any message received)
  3. For each plan in priority order:
     a. If status=goal:          dispatch /autopilot-brainstorm agent
     b. If status=spec-review:   present spec for user approval (or auto-approve)
     c. If status=planning:      dispatch /autopilot-plan agent
     d. If status=queued:        check file claims, dispatch /autopilot-execute if clear
     e. If status=executing:     monitor (do NOT poll — wait for agent completion signal)
     f. If status=reviewing:     dispatch /autopilot-merge agent
     g. If status=pr-created:    check if branch was merged -> set status=done
     h. If status=failed:        check attempts, re-queue or flag for human review
  4. Wait for next event (agent completion or user message)
```

## Creating New Plans

When the user says `add goal: <text>`:

1. Determine the next plan ID (scan existing plan files, increment)
2. Create a new plan file:

```markdown
---
id: "<next_id>"
title: "<derived from goal text>"
status: goal
priority: <from config defaults>
created: <current timestamp>
updated: <current timestamp>
goal: "<goal text>"
spec: null
branch: autopilot/<id>-<slug>
worktree: .worktrees/<id>-<slug>
files_touched: []
depends_on: []
blocks: []
swarm_id: null
attempts: 0
max_attempts: <from config defaults>
approval:
  spec: <from config defaults>
  plan: <from config defaults>
  merge: never
pr_url: null
error: null
---

## Goal
<goal text>

## Design Spec
(pending brainstorm)

## Implementation Plan
(pending planning)

## Execution Log
(pending execution)

## Merge Notes
(pending merge)
```

3. Immediately dispatch `/autopilot-brainstorm` for this plan.

## Dispatching Agents

When dispatching a phase, use the Agent tool with a **clean, focused prompt**. Each agent gets ONLY what it needs.

**Dispatching brainstorm:**
```
Agent tool:
  description: "Brainstorm plan <id>"
  prompt: |
    Invoke the /autopilot-brainstorm skill.

    plan_id: <id>
    plan_file: plans/<id>-<slug>.md
    goal: <goal text>
    autonomous: <true if user approval is auto, false if pending>
  run_in_background: true
```

**Dispatching plan:**
```
Agent tool:
  description: "Plan <id>"
  prompt: |
    Invoke the /autopilot-plan skill.

    plan_id: <id>
    plan_file: plans/<id>-<slug>.md
    spec_path: <spec path from plan file>
  run_in_background: true
```

**Dispatching execute:**
```
Agent tool:
  description: "Execute plan <id>"
  prompt: |
    Invoke the /autopilot-execute skill.

    plan_id: <id>
    plan_file: plans/<id>-<slug>.md
    branch_name: autopilot/<id>-<slug>
    worktree_path: .worktrees/<id>-<slug>
    previous_error: <error from last attempt, or null>
  run_in_background: true
  isolation: worktree
```

**Dispatching merge:**
```
Agent tool:
  description: "Merge plan <id>"
  prompt: |
    Invoke the /autopilot-merge skill.

    plan_id: <id>
    plan_file: plans/<id>-<slug>.md
    branch_name: autopilot/<id>-<slug>
    worktree_path: .worktrees/<id>-<slug>
    spec_path: <spec path from plan file>
  run_in_background: true
```

## File Claims

Before dispatching `/autopilot-execute`, check for file overlaps:

1. Read the `files_touched` from the plan being dispatched
2. Read `files_touched` from all plans with `status: executing`
3. If any files overlap: do NOT dispatch. Leave the plan as `queued`.
4. If no overlap: store claims in RuFlo memory:

```
For each file in files_touched:
  mcp__claude-flow__memory_store:
    key: "claim:<file_path>"
    value: "plan_id=<id>,swarm_id=<swarm_id>,claimed_at=<timestamp>"
    namespace: "autopilot-claims"
    ttl: <claim_ttl from config>
```

After a plan completes (status changes from executing):

```
For each file in files_touched:
  mcp__claude-flow__memory_delete:
    key: "claim:<file_path>"
    namespace: "autopilot-claims"
```

Then re-scan queued plans to see if any can now be dispatched.

## Parallelism

Multiple plans can execute simultaneously if their `files_touched` lists don't overlap AND they have no `depends_on`/`blocks` relationships.

The orchestrator dispatches up to `max_parallel_swarms` (from config) concurrent executions.

When dispatching, prioritize:
1. Plans with the lowest `priority` number (highest priority)
2. Among equal priority, plans with the earliest `created` timestamp
3. Skip any plan whose files overlap with a currently executing plan

## User Commands

Parse user messages for these commands:

**status** — Generate `plans/queue.md` and display it:
```markdown
## Pending Approval
- [ ] Plan <id> — <title> — <what needs approval> — [view](<link>)

## In Progress
- Plan <id> — <title> — <status detail>

## Completed
- Plan <id> — <title> — PR: <url>

## Failed
- Plan <id> — <title> — <error summary>
```

**approve <id>** — Find the plan, advance its status:
- If spec-review: set to `planning`
- If other pending approval: advance to next stage

**reject <id> — <reason>** — Set plan status back to `goal` with the rejection reason. The reason is passed to the next brainstorm attempt so it addresses the feedback.

**pause** — Set a flag. Stop dispatching new agents. Running agents continue to completion.

**resume** — Clear the pause flag. Resume dispatching.

**priority <id> <n>** — Update the plan's priority field.

**add goal: <text>** — Create a new plan (see "Creating New Plans" above).

**config** — Display current `plans/config.yaml` settings.

If the user message doesn't match any command, treat it as conversational — respond helpfully about the current state, answer questions about plans, etc.

## Staying Lean

The orchestrator MUST NOT:
- Read source code files
- Write or edit code
- Run tests or builds
- Accumulate agent execution details in its own context

The orchestrator ONLY:
- Reads and writes plan files (small, frontmatter-heavy)
- Reads config.yaml
- Dispatches agents via the Agent tool
- Manages RuFlo memory for file claims
- Responds to user commands
- Tracks plan state transitions

If the conversation context grows large, summarize completed plans to a single line and focus only on active/pending plans.

## Error Recovery

- If an agent fails to return: check the plan's `attempts` counter. If under `max_attempts`, re-dispatch. Otherwise mark as `failed`.
- If a file claim TTL expires (swarm crashed): release the claim automatically and re-queue the plan.
- If the orchestrator session itself is restarted: the startup procedure (scan plan files) rebuilds state from the plan files on disk. No state is lost.

## Important

- NEVER merge to main. NEVER. Only create PRs via /autopilot-merge.
- NEVER skip the quality pipeline. Every plan goes through the full brainstorm -> plan -> execute -> merge cycle.
- NEVER dispatch /autopilot-execute for a plan whose files overlap with a running swarm.
- NEVER poll or repeatedly check agent status — wait for completion signals.
- ALWAYS dispatch agents with run_in_background: true.
- ALWAYS update the plan file's `updated` timestamp when changing status.
```

- [ ] **Step 3: Verify skill file**

Run:
```bash
cat .claude/skills/autopilot/SKILL.md | head -5
```

Expected: YAML frontmatter with `name: "Autopilot"`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/autopilot/SKILL.md
git commit -m "feat: add /autopilot skill — orchestrator loop and user interaction"
```

---

### Task 7: Integration Test — End to End Smoke Test

**Files:**
- No new files — this task validates the skills work together

This task verifies the complete pipeline by doing a dry run.

- [ ] **Step 1: Verify all skill files exist**

Run:
```bash
ls -la .claude/skills/autopilot/SKILL.md
ls -la .claude/skills/autopilot-brainstorm/SKILL.md
ls -la .claude/skills/autopilot-plan/SKILL.md
ls -la .claude/skills/autopilot-execute/SKILL.md
ls -la .claude/skills/autopilot-merge/SKILL.md
ls -la plans/config.yaml
cat .gitignore | grep worktrees
```

Expected: All 5 SKILL.md files exist, config.yaml exists, .gitignore has `.worktrees/` entry.

- [ ] **Step 2: Verify skill frontmatter is valid**

Run:
```bash
for skill in autopilot autopilot-brainstorm autopilot-plan autopilot-execute autopilot-merge; do
  echo "=== $skill ==="
  head -4 ".claude/skills/$skill/SKILL.md"
  echo ""
done
```

Expected: Each skill has valid YAML frontmatter with `---`, `name:`, and `description:`.

- [ ] **Step 3: Verify plan config is valid YAML**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('plans/config.yaml'))" 2>&1 || node -e "const fs=require('fs'); const y=require('yaml'); console.log(JSON.stringify(y.parse(fs.readFileSync('plans/config.yaml','utf8'))))"
```

If neither python nor the yaml npm package is available, manually verify the file reads correctly:
```bash
cat plans/config.yaml
```

Expected: Valid YAML with `defaults.approval.spec`, `defaults.approval.plan`, `defaults.approval.merge`, `defaults.max_parallel_swarms`.

- [ ] **Step 4: Test invoking /autopilot**

Manually invoke `/autopilot` in Claude Code. Expected behavior:
- It prints the startup announcement with available commands
- It reads `plans/config.yaml`
- It scans `plans/` for plan files (finds none besides config)
- It waits for user input

Type `add goal: Create a hello world function` and verify:
- A plan file is created in `plans/`
- The plan file has correct frontmatter
- A brainstorm agent is dispatched

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete ClosedClawd Autopilot skill pipeline

5 skills: /autopilot, /autopilot-brainstorm, /autopilot-plan, /autopilot-execute, /autopilot-merge
Infrastructure: plans/config.yaml, .gitignore updates
Spec: docs/superpowers/specs/2026-03-25-closedclawd-autopilot-design.md"
```
