# Subtask 01: Implement round game UI and logic

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — Cleanup unused demo and metadata](./02-cleanup-and-metadata.md)

## Objective

Ship a working **closest-to-50** two-player round game on the app home page under `test-orchestration/t3-stack-project`.

## Context

- Replace `src/app/page.tsx` content to render a new client component (e.g. `src/app/_components/closest-to-50-game.tsx`).
- Remove imports/usage of `ClickCounter` from the home page in this subtask (file deletion can wait for [02](./02-cleanup-and-metadata.md) if you prefer, but the route must not render it).

## Steps

1. Add `"use client"` component implementing:
   - Round state machine: Player 1 roll → Player 2 roll → show comparison → allow **Next round** (reset rolls, keep scores).
   - Random integer **0–100 inclusive** per roll: `Math.floor(Math.random() * 101)`.
   - Winner: smaller `Math.abs(roll - 50)` wins; equal distance ⇒ **tie** for the round.
   - Scoreboard: wins for P1, P2, ties (optional but recommended).
   - Disable the roll button when not applicable; show whose turn.
2. Update `src/app/page.tsx` to render only the game (simple layout wrapper acceptable).
3. Run `npx tsc --noEmit` and `npm run build` inside `test-orchestration/t3-stack-project` if feasible; fix errors from this change.

## Acceptance criteria

- [ ] Home page shows the game; turn-based rolls work without console errors.
- [ ] Both rolls use inclusive 0–100; winner/tie matches distance-to-50 rule.
- [ ] `ClickCounter` is no longer shown on `/`.

## Notes / risks

- Keep strings in clear English unless product asks otherwise.
