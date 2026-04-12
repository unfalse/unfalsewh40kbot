# Subtask 01: Extend LlmService for `chat`

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — MentionHandler, registry wiring, summary guard](./02-mention-handler-wiring.md)

## Objective

Add `"chat"` to `PersonaContext` and extend `GeminiLlmService` so `wrapInPersona(content, "chat")` uses a dedicated max-output token budget in the **150–300** range, **temperature 0.9**, and a new `userInstructionFor` case: a **Russian** instruction for a slightly exasperated, “slightly wtf” Tech-Priest (Лексмеханик) who answers direct questions **in character**, concisely, suitable for Telegram. Existing branches (`weather`, `summary`, `error`) must behave **identically** to today (same strings, same numeric constants).

## Context

- Primary file: `src/services/llm.service.ts` (current `PersonaContext`, `TOKENS`, `TEMPERATURE`, `userInstructionFor`, `GeminiLlmService.wrapInPersona`).
- Shared system prompt `LEX_SYSTEM` stays as-is unless you have an explicit requirement to duplicate persona nuance there; the product ask is satisfied by the **`chat`** user-instruction branch + temperature/tokens.

## Steps

1. Extend `export type PersonaContext` with `"chat"`.
2. Add `chat` entries to `TOKENS` and `TEMPERATURE`:
   - `TEMPERATURE.chat = 0.9` (required).
   - `TOKENS.chat`: pick an integer in **150–300** (e.g. `256` or `300`) — this maps to `maxOutputTokens` in the existing `generateContent` config.
3. Add `case "chat":` to `userInstructionFor` returning a Russian instruction that:
   - Frames the following `---` block as the **user’s message** (after mention strip happens upstream).
   - Demands **short** answers, in-character Tech-Priest voice, **slightly irritated / “что происходит”** energy, still technically helpful where applicable.
   - Does not contradict `LEX_SYSTEM` (liturgy + Telegram-friendly formatting).
4. Confirm the `switch` in `userInstructionFor` is exhaustive for `PersonaContext` (TypeScript should narrow; no fall-through needed).
5. **Do not** change the `contextType === "error"` special case in `catch` unless required for compilation.
6. Run `npm run build` locally after edits (full green expected after [02](./02-mention-handler-wiring.md) if this file alone is insufficient for a clean build, but this subtask should not introduce type errors).

## Acceptance criteria

- [ ] `PersonaContext` includes `"chat"`.
- [ ] `TOKENS.chat` is between 150 and 300 inclusive; `TEMPERATURE.chat === 0.9`.
- [ ] `userInstructionFor("chat")` returns a Russian instruction matching the persona brief (exasperated Tech-Priest, direct Q&A in character).
- [ ] `weather`, `summary`, and `error` token/temperature values and instruction strings are unchanged from the pre-change file.
- [ ] No new npm packages.

## Notes / risks

- If `maxOutputTokens` is set too low, answers may truncate mid-sentence; staying near **256–300** is a good default for “short” chat replies.
- The `"error"` path still returns the hardcoded fallback when `contextType === "error"` inside `catch`; `"chat"` failures should continue to throw `llm_unavailable` like other non-error contexts unless product later asks otherwise.
