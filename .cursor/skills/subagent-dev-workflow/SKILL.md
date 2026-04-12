---
name: subagent-dev-workflow
description: Orchestrates implementation tasks using the project worker and code-reviewer subagents in a fixed order with a remediation loop. Use when the user requests implementation, creation, refactoring, bug fixes, or any hands-on development work in this repository, and subagents are available.
---

# Subagent development workflow

When the task is **implementation, creation, refactoring, bug fixes, or other hands-on development** (not planning-only), follow this sequence. Use the project subagents in `.cursor/agents/`: **worker**, then **code-reviewer**.

## 1. Worker first

Launch the **worker** subagent to perform the full development task (code changes, wiring, tests if requested, verification the worker can run).

Do not launch **code-reviewer** before the worker has finished the requested work.

## 2. Code review second

After the worker completes, launch the **code-reviewer** subagent on the worker’s output (relevant files or diff).

The reviewer must report **critical** issues, important flaws, and **meaningful optimization** opportunities (correctness, security, maintainability, performance). Skip trivial style unless it conflicts with project norms.

## 3. Remediation loop

If the code reviewer reports **any** of the following, they must describe each item clearly (what, why, where):

- Critical or blocking problems  
- Non-trivial bugs or edge-case failures  
- Security or data-integrity concerns  
- Worthwhile optimizations (clarity, structure, performance, duplication)

Then launch the **worker** again with a single consolidated brief: implement **all** reviewer items (fixes and agreed optimizations). Treat the reviewer’s list as the checklist for this pass.

After that remediation pass, run **code-reviewer** once more on the updated changes. If new critical or must-fix items appear, repeat **worker → code-reviewer** until none remain or the user caps iterations.

## 4. When this workflow does not apply

- Read-only questions, architecture discussion only, or “explain how X works” → no subagent chain required unless the user asks for code changes afterward.

## Handoff tips

- Each **worker** invocation should receive full task context plus, on follow-ups, the reviewer’s numbered findings.  
- Each **code-reviewer** invocation should name scope (files/commits) and whether this is the initial review or post-fix verification.
