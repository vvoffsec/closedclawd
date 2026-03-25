# ClosedClawd Autopilot — Design Specification

## Overview

ClosedClawd Autopilot is a multi-skill pipeline that turns high-level goals into pull requests through autonomous agent swarms. It solves the context window bloat problem by keeping a lean orchestrator in the main session and dispatching isolated swarms — each with purpose-built, clean context windows — to handle individual plans.

Quality and implementation correctness are paramount. The system trades context generosity for correctness: agents receive liberal context to ensure they understand what they're building, with auto-decomposition as a safety valve for plans that exceed context budgets.

The system never merges to main. Every completed plan produces a PR. The user controls what lands.

## Core Principles

1. **Autonomy scales with spec quality.** Vague goals produce vague code. Detailed specs produce precise implementations. The user's investment is at the spec level.
2. **Every token earns its place, but err on the side of more context.** An agent with too much context might lose some focus; an agent with too little will write wrong code.
3. **The orchestrator stays lean.** It dispatches and monitors. It never implements.
4. **Each agent gets a clean context window.** Purpose-built with only what that agent needs for its specific role.
5. **Never merge to main.** Always create PRs. The user decides what lands.

## System Flow

```
User Goal (text)
    |
/autopilot (orchestrator — main context window)
    |
/autopilot-brainstorm --> design spec (markdown)
    |
User approves spec (or auto-approve if configured)
    |
/autopilot-plan --> implementation plan with file manifest + dependency graph
    |
Dependency analysis: file overlap check across all queued plans
    |
/autopilot-execute (one per plan, each in its own git worktree)
    | spawns swarm:
    |-- TDD agent
    |-- Coder agent(s)
    |-- Simplifier agent
    |-- Reviewer agent
    |-- Security agent
    |-- Doc agent
    |-- Verifier agent
    |
/autopilot-merge --> rebase, push branch, create PR
    |
Orchestrator updates plan status to "pr-created"
    |
User merges PR when ready
```

## Skills

### /autopilot — Orchestrator

The main entry point. Runs in the primary context window and stays lean.

Responsibilities:
- Maintain the goal queue
- Dispatch brainstorm/plan/execute/merge phases as agents with clean context
- Track parallel swarm status via RuFlo tasks + plan files
- Handle user interaction (approval queue, status queries, goal injection)
- Compare file manifests across queued plans to determine parallelism
- Manage file claims via RuFlo memory
- Detect when PRs have been merged and update plan status to "done"

The orchestrator does not read source code, write code, or run tests. It coordinates.

### /autopilot-brainstorm — Goal to Design Spec

Receives a high-level goal and runs structured brainstorming to produce a design specification.

Input: Goal text from the user
Output: Design spec saved to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

Process:
1. Analyze the goal in the context of the existing codebase
2. Ask clarifying questions (if user is present) or make reasonable assumptions (if autonomous)
3. Explore 2-3 approaches with trade-offs
4. Produce a detailed design spec covering: architecture, components, data flow, error handling, testing strategy
5. If user is present: present spec for approval
6. If user is away: save spec and set plan status to `spec-review`

### /autopilot-plan — Design Spec to Implementation Plan

Takes an approved design spec and produces a concrete implementation plan.

Input: Approved design spec
Output: Implementation plan with file manifest, saved to plan file

The plan includes:
- Ordered implementation tasks
- File manifest with dependency graph (which files to create/modify, which files each agent needs to read for context)
- Test strategy (what to test, acceptance criteria)
- Dependencies on other plans
- Estimated agent count (how many coder agents needed)

File manifest format:
```yaml
files_touched:
  - path: src/auth/middleware.ts
    action: modify
    context_deps:
      - src/auth/types.ts
      - path: src/server.ts
        lines: 45-62
  - path: src/auth/jwt.ts
    action: create
    context_deps:
      - src/auth/types.ts
```

The `context_deps` field tells the Context Assembler which additional files (or file sections) each agent needs to read — not modify — to understand what it's working with.

If the plan's total context (files to modify + context deps) would exceed 70% of the model's context window, the plan is automatically decomposed into smaller sub-plans that each fit within budget.

### /autopilot-execute — Plan to Code

Runs in an isolated git worktree. Dispatches a hierarchical swarm to implement the plan.

Input: Implementation plan
Output: Completed code in worktree branch, ready for merge

#### Swarm topology:

```
Swarm Coordinator (runs in worktree)
|
|-- TDD Agent
|   Writes test skeletons from the plan before any implementation
|
|-- Coder Agent(s) (1-3 depending on plan size)
|   Implements code to pass the tests
|
|-- Simplifier Agent
|   Runs simplify skill on all changed files
|
|-- Reviewer Agent
|   Runs code review, flags issues back to Coder
|
|-- Security Agent
|   Scans for vulnerabilities, OWASP top 10
|
|-- Doc Agent
|   Runs humanizer on generated comments/docs
|
|-- Verifier Agent
    Final check: runs all tests, confirms build, validates completeness
```

#### Quality pipeline execution order:

```
1. TDD Setup           (superpowers:test-driven-development)
2. Implementation       (coder agents write code)
3. Simplification       (simplify skill — cleanup AI-generated code)
4. Code Review          (superpowers:requesting-code-review)
   --> If issues found: loop back to step 2 (max 3 cycles)
5. Security Scan        (security agent)
6. Doc Cleanup          (humanizer — on generated docs/comments)
7. Verification         (superpowers:verification-before-completion)
   --> If tests fail: systematic-debugging, loop back to step 2 (max 3 cycles)
8. Done --> signal orchestrator
```

#### Retry logic:

If execution fails after exhausting internal review/debug cycles, the swarm reports failure to the orchestrator. The orchestrator increments the plan's `attempts` counter and re-queues. The error message and execution log from the failed attempt are passed to the next swarm so it doesn't repeat the same mistake. Max 3 total attempts before marking the plan as failed and flagging for human review.

### /autopilot-merge — Code to PR

Takes a completed worktree branch and creates a pull request.

Input: Completed worktree branch
Output: Pull request on remote

Process:
1. Rebase worktree branch onto current main
2. If conflicts: Merge Agent attempts resolution
   - Merge Agent receives: the plan's intent, the conflicting diff, both file versions, the test suite
   - Resolves conflicts preserving both changes' intent
   - Runs full test suite to verify
3. Push branch to remote
4. Create PR with:
   - Summary from the plan
   - Execution log (what each agent did)
   - Test results
   - Security scan results
   - Link to spec and plan files
5. If conflicts couldn't be auto-resolved: PR is created as draft with conflict notes
6. Cleanup worktree
7. Update plan status to `pr-created`

The system never merges PRs. The user merges when ready. Plan status transitions to `done` when the orchestrator detects the branch has been merged.

## Context Budget Strategy

### Principle

Err on the side of more context. Quality and correctness are paramount. A slightly larger context is a small price for correct implementations.

### Context tiers by agent role:

| Agent | Must Have | Include by Default | Only Drop at Hard Limit |
|-------|-----------|-------------------|------------------------|
| TDD | Plan's test strategy, API contracts, existing test patterns | Related test files for style reference, interface definitions | Unrelated source files |
| Coder | Plan tasks, test skeletons, file manifest, relevant existing code being modified | Architecture notes from spec, related module code, type definitions | Other plans, execution logs |
| Simplifier | Changed files, project coding conventions | Before/after examples from prior simplifications | The plan itself, unrelated source files |
| Reviewer | Changed files, plan's acceptance criteria, test results | Security guidelines, project conventions, related code | How the code was generated |
| Security | Changed files, dependency list, known vulnerability patterns | OWASP checklist, project security rules | The plan, tests, implementation history |
| Doc | Changed files, project doc conventions | Existing docs for style reference | Source code internals |
| Verifier | Test output, build output, plan's definition of done | Coverage report, plan summary | Full source code |

### Context assembly process:

For each agent, the Context Assembler (part of the Swarm Coordinator):
1. Extracts the plan sections relevant to this agent's role
2. Reads the files in the file manifest that this agent needs
3. For files being modified: includes the full current file content
4. For context dependencies: includes full file if under ~300 lines, or scoped lines if larger
5. Includes project conventions (CLAUDE.md, .editorconfig, tsconfig) — small, high-value context
6. For retries: includes only the specific feedback from the prior cycle, not full history

### Guardrails:

- **Soft limit (50% of context window):** Nominal target. Context Assembler includes everything in "Must Have" and "Include by Default" tiers.
- **Hard limit (70% of context window):** If assembled context exceeds this, drop items from the "Only Drop at Hard Limit" tier.
- **Auto-decomposition:** If "Must Have" context alone exceeds 70%, the plan is too large. It's sent back to `/autopilot-plan` for decomposition into smaller sub-plans.

## Plan Lifecycle

```
goal --> brainstorming --> spec-review --> planning --> queued --> executing --> reviewing --> pr-created --> done
                                            ^                       |
                                            +-- failed (retry) -----+
```

### Plan file format:

Location: `plans/<id>-<slug>.md`

```yaml
---
id: "001"
title: "JWT Authentication System"
status: queued
priority: 1
created: 2026-03-25T10:00:00Z
updated: 2026-03-25T10:00:00Z
goal: "Add JWT auth with refresh tokens and role-based access"
spec: docs/superpowers/specs/2026-03-25-auth-system-design.md
branch: autopilot/001-auth-system
worktree: .worktrees/001-auth-system
files_touched:
  - src/auth/jwt.ts
  - src/auth/middleware.ts
  - src/auth/roles.ts
  - tests/auth/*.test.ts
depends_on: []
blocks: ["003"]
swarm_id: null
attempts: 0
max_attempts: 3
approval:
  spec: pending
  plan: auto
  merge: never
pr_url: null
error: null
---

## Goal
(goal text)

## Design Spec
(link to spec doc)

## Implementation Plan
(populated by /autopilot-plan)

## Execution Log
(appended by /autopilot-execute)

## Merge Notes
(populated by /autopilot-merge)
```

## File Claims & Conflict Resolution

### File claims:

Before a swarm starts, the orchestrator claims files via RuFlo memory:
- Check if any file in the manifest is claimed by a running swarm
- If no conflicts: claim all files, proceed
- If conflicts: queue the plan until the conflicting swarm finishes

Claims have TTL (1 hour default) and auto-expire if a swarm crashes.

### Parallelism rules:

| Scenario | Resolution |
|----------|-----------|
| No file overlap | Both swarms run in parallel |
| Partial overlap | Second plan queues until first completes and its claims are released |
| Full overlap | Strict sequential by priority |
| Dependency chain (depends_on/blocks) | Sequential regardless of file overlap |

### Post-completion cascade:

After a swarm completes and a PR is created:
1. Release file claims
2. Check if any queued plans were blocked by those files — re-queue them
3. Notify any waiting swarms that main may have changed (if the user merged a PR)

## User Interaction

### Three modes:

**Autonomous mode** (no user messages):
- The system does not detect user presence. It simply processes plans based on their approval settings.
- Goals with `approval: auto` on all gates flow through the full pipeline without waiting.
- Goals requiring approval (`approval: pending`) queue up and wait.
- The system processes everything it can without blocking.

**Interactive mode** (user sends a message):
- Any user message makes them interactive. The orchestrator responds directly.
- Pending approvals presented immediately upon any user interaction.
- User can approve/reject in real-time.
- User can inject goals, reprioritize, pause swarms.

**Review mode** (user sends "status" after being away):
- Summary of all activity since last interaction.
- Batch approve/reject pending items.
- Review PRs from completed plans.

### Commands (from main session):

- `status` — summary of all plans and their states
- `approve <id>` — approve pending spec/plan
- `reject <id> — <reason>` — reject with feedback (sends back to brainstorm)
- `pause` — stop dispatching new swarms (running ones finish)
- `resume` — resume dispatching
- `priority <id> <n>` — set plan priority
- `add goal: <description>` — inject a new goal
- `config` — view/edit default approval settings

### Approval queue file (`plans/queue.md`):

Auto-generated summary of current state:
- Pending approvals with links to specs
- In-progress plans with pipeline step
- Recently completed plans
- Failed plans with error links

### Default configuration (`plans/config.yaml`):

```yaml
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
  claim_ttl: 3600           # 1 hour
```

## Technical Dependencies

- **Claude Code** — Task/Agent tool for dispatching agents with clean context windows
- **RuFlo (claude-flow) MCP** — swarm init, memory (file claims), task tracking, hooks
- **Git** — worktree isolation, branching, PR creation via `gh` CLI
- **Existing superpowers skills** — test-driven-development, simplify, systematic-debugging, requesting-code-review, verification-before-completion, humanizer

## File Structure

```
plans/
  config.yaml              # default settings
  queue.md                 # auto-generated status summary
  001-auth-system.md       # plan files
  002-cache-layer.md
  ...
docs/superpowers/specs/
  2026-03-25-auth-system-design.md    # design specs
  ...
.worktrees/                # git worktrees (gitignored, transient)
  001-auth-system/
  003-api-routes/
```

## Skills to Build

| Skill | File | Purpose |
|-------|------|---------|
| `/autopilot` | `.claude/skills/autopilot/autopilot.md` | Orchestrator loop and user interaction |
| `/autopilot-brainstorm` | `.claude/skills/autopilot/autopilot-brainstorm.md` | Goal to design spec |
| `/autopilot-plan` | `.claude/skills/autopilot/autopilot-plan.md` | Design spec to implementation plan |
| `/autopilot-execute` | `.claude/skills/autopilot/autopilot-execute.md` | Plan to code via swarm |
| `/autopilot-merge` | `.claude/skills/autopilot/autopilot-merge.md` | Code to PR |

## Out of Scope (for now)

- Web UI for monitoring (file-based + CLI is sufficient)
- Multi-repo coordination (single repo focus)
- Custom agent types beyond the standard pipeline
- Integration with external CI/CD (PRs are the interface)
