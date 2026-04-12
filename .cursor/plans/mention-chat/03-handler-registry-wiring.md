# Subtask 03: Handler registry — instantiate and register order

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [02 — MentionChatHandler](./02-mention-chat-handler.md)
- Next: none

## Objective

Wire `MentionChatHandler` into `HandlerRegistry`: private field, construction in constructor, and `bot.on("message:text", ...)` registration **before** the existing `SummaryTextHandler` listener. Do not change `SummaryTextHandler` or `WeatherCommandHandler` implementation bodies.

## Context

- File: `src/handlers/index.ts`
- Current: `bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx));` only.
- `BotDeps` already includes `llm: LlmService` — sufficient for `MentionChatHandler`.

## Steps

1. Add `import { MentionChatHandler } from "./mention.handler";` (path/name as implemented in [02](./02-mention-chat-handler.md)).
2. Add `private readonly mentionChatHandler: MentionChatHandler;` to `HandlerRegistry`.
3. In constructor: `this.mentionChatHandler = new MentionChatHandler({ llm: deps.llm });` (or equivalent matching [02](./02-mention-chat-handler.md) constructor shape).
4. In `register`, **before** the summary line, add:
   - `bot.on("message:text", (ctx) => this.mentionChatHandler.handle(ctx));`
5. Keep the existing summary registration unchanged immediately after.
6. From repo root, run `npm run build` and fix any compile errors.

## Acceptance criteria

- [ ] `MentionChatHandler` is imported, stored, and constructed with `{ llm }`.
- [ ] `message:text` listener for mention runs **before** the summary listener in source order.
- [ ] No edits to `summary.handler.ts` or `weather.handler.ts` **logic** (constructor/deps of `HandlerRegistry` may still pass `deps` to other handlers as today).
- [ ] `npm run build` exits successfully.

## Notes / risks

- grammY runs multiple `on("message:text")` handlers for the same update; order follows registration order — verify mention is registered first.
- If `handle` is async, the arrow callback should `void this.mentionChatHandler.handle(ctx)` or `return this.mentionChatHandler.handle(ctx)` — follow the same pattern as the existing summary line (`(ctx) => this.summaryHandler.handle(ctx)`).
