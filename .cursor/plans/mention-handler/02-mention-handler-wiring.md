# Subtask 02: MentionHandler, registry wiring, summary guard

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — Extend LlmService for `chat`](./01-extend-llm-chat-context.md)
- Next: none

## Objective

Implement `MentionHandler` (`src/handlers/mention.handler.ts`), register it on `message:text` **before** `SummaryTextHandler`, and add a summary-side guard so messages that tag the bot never enter URL summary logic. Ensure replies use **typing** during generation and **threaded** `ctx.reply` via `reply_parameters`. Align `src/bot.ts` with whatever export pattern `src/handlers/index.ts` uses so **`npm run build`** passes.

## Context

- [01](./01-extend-llm-chat-context.md) adds `"chat"` to `LlmService` / `PersonaContext`.
- `src/handlers/index.ts` — `HandlerRegistry`, `BotDeps`, `bot.on("message:text", …)` for summary today.
- `src/handlers/summary.handler.ts` — `SummaryTextHandler.handle`; add early return when mention present.
- `src/bot.ts` — constructs services and registers handlers; may still reference `registerHandlers` (resolve in this subtask).
- grammY: `ctx.replyWithChatAction("typing")`, `ctx.reply(text, { reply_parameters: { message_id: ctx.message.message_id } })` (per user spec; adjust only if the installed grammY types require a slightly different shape — prefer the spec’s `reply_parameters`).

## Steps

### A. `MentionHandler`

1. Create `src/handlers/mention.handler.ts` exporting `export class MentionHandler`.
2. Constructor shape: `constructor(deps: { llm: LlmService })` (or `readonly llm: LlmService` field); import `LlmService` type from `../services/llm.service`.
3. `async handle(ctx: Context): Promise<void>`:
   - Read `const text = ctx.message?.text`. If missing, return.
   - Resolve bot username: `const me = ctx.me;` if `!me?.username`, return.
   - Build mention needle **case-insensitive**: e.g. lower-case compare `text.toLowerCase().includes("@" + me.username.toLowerCase())`; if false, **return** (no reply).
   - **Strip** mentions: remove `@${me.username}` occurrences case-insensitively (e.g. regex with `i` flag, escape regex-special chars in username if needed — Telegram usernames are `[a-zA-Z0-9_]`). Trim the remainder.
   - If stripped string is **empty**: `ctx.reply` with a **short** static Russian line in Tech-Priest voice (“you called?” vibe) — **no** `llm.wrapInPersona` call; still use `reply_parameters` for threading.
   - Else: `await ctx.replyWithChatAction("typing")`, then `const result = await this.llm.wrapInPersona(stripped, "chat")`, then `await ctx.reply(result, { reply_parameters: { message_id: ctx.message.message_id } })`.
4. On LLM failure: either let `bot.catch` handle (consistent with other handlers) or mirror `summary.handler` error UX — default **rethrow** or minimal `try/catch` with `wrapInPersona(..., "error")` only if you want symmetry; **do not** expand scope unless needed for UX.

### B. `HandlerRegistry` (`src/handlers/index.ts`)

1. Add `private readonly mentionHandler: MentionHandler`.
2. In constructor: `this.mentionHandler = new MentionHandler({ llm: deps.llm });` (same `deps.llm` as other handlers use).
3. In `register(bot)`:
   - **First:** `bot.on("message:text", (ctx) => this.mentionHandler.handle(ctx));`
   - **Second (unchanged order relative to today):** `bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx));`
4. Export `MentionHandler` from the handler module if you want cleaner imports (optional).

### C. `SummaryTextHandler` guard (`src/handlers/summary.handler.ts`)

1. After resolving `text` and before URL collection, if `ctx.me?.username` is set and `text` contains `@` + that username (case-insensitive substring check), **return** immediately so URL logic never runs for bot-tagged messages.

### D. Build / entry alignment

1. If `bot.ts` imports `registerHandlers` but `index.ts` does not export it, either:
   - Add `export function registerHandlers(bot: Bot, deps: BotDeps): void { new HandlerRegistry(deps).register(bot); }`, **or**
   - Change `bot.ts` to `import { HandlerRegistry } …` and call `new HandlerRegistry({ llm, weather, parser }).register(bot)`.
2. Run `npm run build` and fix any type errors (e.g. `ctx.message` possibly undefined — narrow after early checks).

## Acceptance criteria

- [ ] `MentionHandler` exists at `src/handlers/mention.handler.ts` with `export class MentionHandler` and `{ llm: LlmService }` constructor deps.
- [ ] Mention detection is **case-insensitive** for `@username` vs `ctx.me.username`.
- [ ] Non-mention text messages: `MentionHandler` returns without replying; behaviour unchanged for summary/weather aside from the new guard.
- [ ] Empty body after strip: static short persona reply, **no** LLM, **with** `reply_parameters`.
- [ ] Non-empty body: `replyWithChatAction("typing")`, then `wrapInPersona(stripped, "chat")`, then `ctx.reply` with `reply_parameters: { message_id: ctx.message.message_id }`.
- [ ] `SummaryTextHandler` bails when message text mentions the bot (case-insensitive), using `ctx.me?.username`.
- [ ] `bot.on("message:text", mention)` is registered **before** `bot.on("message:text", summary)`.
- [ ] `npm run build` passes; no new dependencies.

## Notes / risks

- **Regex username:** Escape `me.username` when building a `RegExp` so a future unusual username does not break stripping (Telegram’s rules are restrictive, but escaping is cheap).
- **Commands:** If a message is `/start@BotName`, it may not hit `message:text` the same way as plain text — out of scope unless you add command handlers later.
- **Summary `ctx.reply` without `reply_parameters`:** Leaving summary replies non-threaded is pre-existing; only the mention path is required to thread per this plan.
- **Double typing:** If mention handler returns early, summary may still send typing for URL flow — acceptable.
