---
description: Runs the dev chain worker → code-reviewer → remediation loop per subagent-dev-workflow skill.
---

# Implement

Execute the **full** process defined in `.cursor/skills/subagent-dev-workflow/SKILL.md`: open that file if it is not already in context, then follow every step without shortcuts.

## Required sequence

1. **Worker** — subagent from `.cursor/agents/worker.md`: pass the complete implementation task from the user’s request (context, constraints, repo paths). Do **not** start **code-reviewer** until the worker has finished.
2. **Code-reviewer** — subagent from `.cursor/agents/code-reviewer.md`: scope is the worker’s output (changed files or diff). Use the reviewer’s own output format (critical / warnings / suggestions).
3. **Skill loop** — if the reviewer reports critical issues, serious defects, or meaningful optimizations: run **worker** once with a single consolidated checklist of all items to address, then **code-reviewer** again; repeat **worker → code-reviewer** until no critical or must-fix items remain, or the user caps iterations.

## Final reply to the user

Briefly: what was done, key files touched, outcome of the last review (no critical blockers, or what remains open).

Do not invent a different order or criteria—only what `subagent-dev-workflow` and the subagent prompts specify.
