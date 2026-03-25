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

After writing the spec, update the plan file frontmatter:
- Set `status` to `spec-review` (if autonomous, awaiting user review) or `planning` (if user approved interactively)
- Set `spec` to the path of the written spec file
- Set `updated` to the current timestamp

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
