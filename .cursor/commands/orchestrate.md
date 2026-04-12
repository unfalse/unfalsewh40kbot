---
description: Runs planner → per-task worker → code-reviewer for large or multi-part work via orchestrate-workflow skill.
---

# Orchestrate

Execute the **full** process defined in `.cursor/skills/orchestrate-workflow/SKILL.md`: open that file if it is not already in context, then follow every phase without shortcuts. Apply it to the user’s **large complex goal** or **list of related tasks** stated in this message (or the thread the command continues).

## Required sequence (must match the skill)

1. **Planner** — subagent from `.cursor/agents/planner.md`: produce a plan under `.cursor/plans/<short-slug>/` with `00-overview.md`, linked `NN-*.md` task files, and execution order / dependencies as the planner defines. **Do not** start **worker** for product implementation until this is done.

2. **Per task file (in plan order)** — for each subtask spec:
   - **Worker** (`.cursor/agents/worker.md`): implement **only** that subtask; pass the task file path, `00-overview.md` for context, and user constraints.
   - **Code-reviewer** (`.cursor/agents/code-reviewer.md`): review changes for that subtask.
   - **Remediation loop** — if the reviewer reports critical issues, serious defects, or meaningful optimizations: **worker** again with one consolidated checklist, then **code-reviewer** again; repeat until that subtask has no critical / must-fix items (or the user caps iterations), as in the skill.
   - Move to the **next** task file only after the current one passes its gate.

3. **Completion** — when **all** planned subtasks are done and reviewed, summarize per the skill (plan path, what was shipped, any deferred follow-ups).

Do not invent a different pipeline—only what `orchestrate-workflow` and the **planner**, **worker**, and **code-reviewer** prompts specify.
