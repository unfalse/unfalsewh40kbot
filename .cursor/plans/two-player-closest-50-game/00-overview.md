# Plan: Two-player “closest to 50” game (test-orchestration T3 app)

## Goal

Replace the main page of `test-orchestration/t3-stack-project` with a **two-player** mini-game: players take turns pressing one button; each press draws a **random integer from 0 to 100 (inclusive)**; after **both** have rolled in the same round, the player whose value is **closer to 50** wins the round (ties if distances are equal). Provide clear UI for whose turn it is, the two rolls, the round outcome, scores, and **next round**.

## Scope

- In-repo path: `test-orchestration/t3-stack-project/`.
- Client-side game state (React `"use client"`). No backend or tRPC changes required.
- Remove the previous home-page demo (`ClickCounter`) from the route; delete the unused component file in a later subtask if nothing else imports it.

## Success criteria

- Home route shows only the game screen (no old counter headline flow).
- Turn order enforced in UI; random draws are uniform on **0..100** inclusive.
- Winner / tie logic uses **distance to 50** (`Math.abs(roll - 50)`).
- `npm run build` passes for the project after all subtasks.

## Subtasks

1. [01 — Implement round game UI and logic](./01-implement-round-game.md)
2. [02 — Cleanup unused demo and metadata](./02-cleanup-and-metadata.md)

## Dependencies

- Subtask **02** depends on **01** (removes artifacts introduced by replacing the page).

## Risks / notes

- Same physical device = shared screen; “two players” is enforced by turn labels, not separate sessions.
