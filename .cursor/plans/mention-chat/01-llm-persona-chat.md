# Subtask 01: LLM persona — add `chat` context

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — MentionChatHandler](./02-mention-chat-handler.md)

## Objective

Extend `PersonaContext` and `GeminiLlmService` configuration so `wrapInPersona(..., "chat")` is valid, uses **800** output tokens and **0.85** temperature, and receives a new `userInstructionFor` branch for free-form Lexmechanicus chat. Existing `weather`, `summary`, and `error` instruction text and numeric settings must remain **unchanged** (verbatim); only add `chat` and satisfy exhaustive `switch` / `Record` typing.

## Context

- File: `src/services/llm.service.ts`
- Current union: `"weather" | "summary" | "error"` (line 3).
- Maps: `TOKENS`, `TEMPERATURE` keyed by `PersonaContext`.
- `userInstructionFor` is a `switch` on `PersonaContext` used inside `wrapInPersona`.

## Steps

1. In `src/services/llm.service.ts`, extend `export type PersonaContext` with `"chat"`.
2. Add `chat: 800` to `TOKENS` and `chat: 0.85` to `TEMPERATURE` (do not change existing numeric literals).
3. Add a new `case "chat":` in `userInstructionFor` returning a Russian (or mixed, matching existing instructions) string that instructs the model to:
   - Reply in character as a Lexmechanicus / Tech-Priest (aligned with `LEX_SYSTEM`);
   - Treat the user content as free-form conversation: answer the question or engage with the text;
   - Stay in persona; suitable for Telegram (consistent tone with other branches).
4. Ensure `switch` covers all `PersonaContext` values so TypeScript is satisfied.
5. Run `npm run build` locally if implementing this slice alone (optional); full build is mandatory after [03](./03-handler-registry-wiring.md).

## Acceptance criteria

- [ ] `PersonaContext` includes `"chat"`.
- [ ] `TOKENS.chat === 800` and `TEMPERATURE.chat === 0.85`.
- [ ] `userInstructionFor("chat")` returns a dedicated instruction string; `weather`, `summary`, `error` cases are **byte-for-byte identical** to pre-change content (no wording or whitespace edits to those three branches).
- [ ] `Record<PersonaContext, number>` for `TOKENS` and `TEMPERATURE` type-checks.
- [ ] No new imports or dependencies.

## Notes / risks

- Do not alter `LEX_SYSTEM`, `DEFAULT_MODEL`, `MAX_CONTENT_CHARS`, or the `catch` fallback behavior in `wrapInPersona` except if strictly required for typing (should not be).
