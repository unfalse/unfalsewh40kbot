---
name: orchestrate-workflow
description: Runs a multi-phase subagent pipeline for large or multi-part work: planner produces linked plan files under `.cursor/plans/`, then each task file is executed by worker with code-reviewer verification and remediation until done, iterating through all tasks until the plan is complete. Use when the user delivers a large complex goal, a backlog list, or an initiative that should be planned first then implemented task-by-task with review gates.
---

# Orchestrate workflow (planner → worker per task → code-reviewer)

Use the project subagents in `.cursor/agents/`: **planner**, **worker**, **code-reviewer**. Do not skip phases or reorder **planner before any worker**.

## When this applies

- One **large** goal, or a **list of related changes**, that benefits from a written plan and multiple execution steps.
- Not for trivial one-file edits unless the user explicitly asks for full orchestration.

## Phase 1 — Planner (once)

1. Launch **planner** (`.cursor/agents/planner.md`) with the user’s full goal, constraints, and repo context.
2. Wait until the planner has produced a plan folder (default: `.cursor/plans/<short-slug>/`) containing at least `00-overview.md` and one file per subtask (`NN-*.md`), with **cross-links** as defined in the planner prompt.
3. **Derive execution order** from `00-overview.md` (Subtasks section and dependency notes). If unclear, follow numeric order of `NN-*` files. Respect **Depends on** links inside task files before running a dependent task.

## Phase 2 — Execute each task (repeat until all tasks done)

For **each** subtask file in order:

1. **Worker** — Launch **worker** (`.cursor/agents/worker.md`). Pass:
   - Path to the current task spec file (primary source of truth).
   - `00-overview.md` path for global context.
   - Any user constraints from the original request.
   - Instruction: implement **only** this subtask; do not start unrelated tasks.

2. **Code-reviewer** — When the worker finishes this subtask, launch **code-reviewer** (`.cursor/agents/code-reviewer.md`) scoped to this subtask’s changes (files / diff).

3. **Remediation loop (same subtask)** — Until this subtask is acceptable:
   - If the reviewer reports **critical** issues, serious defects, or meaningful optimizations (per the reviewer’s own criteria), launch **worker** again with a **single consolidated list** of all items to fix for this subtask, then **code-reviewer** again.
   - Repeat **worker → code-reviewer** until no critical / must-fix items remain for this slice, or the user caps iterations.
   - Reuse the same remediation rules as `.cursor/skills/subagent-dev-workflow/SKILL.md` for consistency.

4. **Advance** — Mark this subtask mentally complete; open the **next** `NN-*.md` and repeat from step 1. Do **not** move to the next task while the current one still has unresolved critical reviewer items (unless the user overrides).

## Phase 3 — Completion

When every planned subtask file has passed its review gate:

- Summarize outcomes: plan folder path, each subtask and its main file touches, and any deferred suggestions (non-blocking) left for follow-up.

## Rules

- **Never** call **worker** for implementation before **planner** has finished writing the plan files (unless the user explicitly cancels planning).
- **One subtask per worker invocation** for the initial implementation pass (remediation passes stay focused on reviewer feedback for that subtask).
- Keep each **code-reviewer** invocation scoped; avoid reviewing unrelated legacy code unless the task touched it.

## Handoff tips

- Tell each subagent **which phase** it is in (planning vs implementing subtask N vs post-fix review).
- If the user adds new scope mid-flight, send them back through **planner** to extend or amend the plan files before more **worker** runs.
