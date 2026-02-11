# Planning Protocol

> **This is the authoritative reference for how agents create plans for Valle Vista Commons.**
> Referenced from `AGENTS.md`.

*Created: February 11, 2026*

---

## Core Principle

**A plan should be so detailed that any agent (or a future you with zero context) could execute it mechanically, phase by phase, without asking a single clarifying question.** If a plan has gaps, ambiguities, or hand-waves — it's not done yet.

---

## When to Plan

Produce a plan for tasks involving:
- New features spanning multiple files
- Database schema changes or migrations
- New middleware or security changes
- Anything the user explicitly asks for a plan on

**Skip planning for:**
- Single-file bug fixes
- Copy/text changes
- Simple styling updates

---

## Before Proposing Anything

1. Read `PROJECT.md` and `server.js`
2. Read `CHANGELOG.md` for recent context
3. Read `prisma/schema.prisma` if the task touches data
4. Understand the **current state** of the code — don't plan against assumptions
5. Ask clarifying questions if there's genuine ambiguity

---

## Plan Structure

Every plan MUST include:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Current State** | What exists today — cite specific files |
| 2 | **What Changes** | Exact description of modifications |
| 3 | **Data Model** | Schema changes if any (exact Prisma additions) |
| 4 | **Implementation Steps** | Ordered steps with file paths and code |
| 5 | **Edge Cases** | Empty states, errors, validation |
| 6 | **Testing** | How to verify the change works |
| 7 | **Open Questions** | Decisions needed before starting |
| 8 | **Out of Scope** | What this plan does NOT do |

---

## Key Rules

### Script the Gray Areas
Between every major step, there are connecting details — data transformations, edge cases, error paths. A good plan fills these in explicitly with:
- **Exact code snippets** (not pseudocode)
- **Data shape examples** (input → output)
- **Error handling** (what does the user see when things fail?)

### No Dead UI
Every interactive element needs a full trace: click → handler → API → DB → UI update. A button with no handler is a bug.

### Privacy Gate
Every plan must answer: **"Does this change collect, store, or expose any personal information?"** If the answer is anything other than "no," stop and redesign.

---

## Anti-Patterns — Never Do These

| Anti-Pattern | What to Do Instead |
|---|---|
| "Add appropriate error handling" | Write the exact try/catch and error message |
| "Create a route for X" | Specify the exact path, method, handler code, and response shape |
| "Update the database" | Write the exact Prisma schema change and migration name |
| "Will wire up later" | Every step must leave the system working |

---

## Plan Output Format

```markdown
# [Feature Name] — Plan

## Current State
[What exists today]

## What Changes
[Exact description]

## Data Model
[Prisma schema changes, if any]

## Steps

### Step 1: [Name]
**Files:** [paths]
**Changes:** [code]
**Verify:** [how to confirm it works]

### Step 2: [Name]
...

## Edge Cases
[List with handling]

## Testing
[How to verify end-to-end]

## Open Questions
[Decisions needed]

## Out of Scope
[What this does NOT do]
```

---

**The bar**: Could someone execute this plan with zero context and produce a working result? If not, add more detail.
