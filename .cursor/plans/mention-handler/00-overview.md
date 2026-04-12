# Plan: @mention handler (Tech-Priest chat persona)

## Goal

When the bot username appears in any text message (case-insensitive `@username`), strip that mention from the text, treat the remainder as a direct address to the Lexmechanic, and reply in-character using `LlmService.wrapInPersona(..., "chat")`. Show the **typing** chat action while the model runs. Replies must thread in groups via `reply_parameters: { message_id: ctx.message.message_id }`. If the stripped text is empty, send a short in-character “you called?” line **without** calling the LLM.

## Scope

- **In scope:** Extend `PersonaContext` and `GeminiLlmService` for `"chat"` (tokens ~150–300 range as specified, temperature `0.9`, Russian user instruction for a slightly exasperated / “slightly wtf” Tech-Priest); new `MentionHandler` in `src/handlers/mention.handler.ts`; `HandlerRegistry` wiring with a **second** `bot.on("message:text", …)` registered **before** the existing summary listener; early bail in `SummaryTextHandler` when the raw message text contains `@<bot_username>` (case-insensitive, using `ctx.me?.username`); ensure `npm run build` passes; **no new npm dependencies**.

- **Out of scope:** Inline queries, edited messages, captions-only flows, changing the base `LEX_SYSTEM` prompt (only add `chat`-specific **user** instruction branch), `/start` copy updates, removing debug `console.log` in `summary.handler.ts` unless needed for build.

## Success criteria

- Tagging the bot in a group or private chat yields a threaded reply with stripped user content processed through `"chat"`.
- Typing indicator appears before the LLM completes (when the LLM path is taken).
- Plain URL messages without a mention still go through `SummaryTextHandler` unchanged.
- Messages that mention the bot do **not** trigger URL summary logic (guard in summary handler).
- `npm run build` exits 0.

## Subtasks (execution order)

1. [01 — Extend LlmService for `chat`](./01-extend-llm-chat-context.md)
2. [02 — MentionHandler, registry wiring, summary guard](./02-mention-handler-wiring.md)

## Dependencies and ordering

[01](./01-extend-llm-chat-context.md) must land first so `MentionHandler` can call `wrapInPersona(..., "chat")` with a complete `PersonaContext` union and runtime config. [02](./02-mention-handler-wiring.md) depends on it.

## Verification

- `npm run build`
- Manual: private chat — `@YourBot hello` → threaded reply, persona tone; `@YourBot` alone → short static line, no LLM.
- Manual: group — same, confirm reply is a **reply** to the triggering message (thread).
- Manual: send `https://example.com` with **no** mention → summary path still works.

## Global risks / decisions

1. **Entrypoint vs registry:** `src/bot.ts` currently imports `registerHandlers` from `./handlers/index.js`, while `src/handlers/index.ts` only defines `HandlerRegistry`. The implementer must resolve this so the project builds (either add a thin `export function registerHandlers(bot, deps) { new HandlerRegistry(deps).register(bot); }` or switch `bot.ts` to `new HandlerRegistry(deps).register(bot)` and export what the entry file needs).

2. **`ctx.me`:** Available on context after the bot is initialized; use optional chaining where TypeScript requires it. Mention detection should no-op if `ctx.me?.username` is missing.

3. **Dual `message:text` listeners:** Both run for every text message; [02](./02-mention-handler-wiring.md) relies on order (mention first) **and** the summary guard so a mention + URL does not double-process into summary.

4. **Strip algorithm:** Match `@` + username with case-insensitive comparison; remove one occurrence (or all occurrences of that exact mention token—spec says “strips the mention”; removing all non-overlapping occurrences of `@username` is reasonable for duplicate pings).

5. **Token budget:** User asked 150–300 tokens for `chat`; map to `TOKENS` in that range (e.g. `256` or `300`) to stay within the Record type and Gemini limits.
