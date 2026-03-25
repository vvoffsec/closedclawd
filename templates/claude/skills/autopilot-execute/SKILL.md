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
All tests passing. Build successful.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### 6. Update Plan File

Update frontmatter:
- Set `status` to `reviewing`
- Set `swarm_id` to the swarm identifier
- Set `updated` to the current timestamp

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
