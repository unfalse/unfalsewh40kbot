# Subtask 02: `MentionChatHandler` implementation

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — LLM persona: `chat` context](./01-llm-persona-chat.md)
- Next: [03 — Handler registry wiring](./03-handler-registry-wiring.md)

## Objective

Add `src/handlers/mention.handler.ts` exporting class `MentionChatHandler` with constructor `{ llm: LlmService }` and `async handle(ctx: Context): Promise<void>` implementing the mention-strip → typing → `chat` LLM → threaded reply flow, with error handling via `'error'` persona.

## Context

- Import style: project uses TypeScript + CommonJS; imports **without** `.js` extension (match `summary.handler.ts`).
- Types: `Context` from `"grammy"`, `LlmService` from `../services/llm.service`.
- Reference patterns: `summary.handler.ts` uses `ctx.replyWithChatAction("typing")` and `ctx.message?.text`.

## Steps

1. Create `src/handlers/mention.handler.ts`.
2. Implement `MentionChatHandler`:
   - `constructor(private readonly deps: { llm: LlmService })` or equivalent field storage matching project style (`SummaryTextHandler` uses explicit fields — match that style).
   - `handle(ctx)`:
     - `const text = ctx.message?.text`; `const username = ctx.me?.username` (defensive optional chaining if `me` can be undefined). If `!text` or `!username`, **return**.
     - Build a case-insensitive test for substring `@` + username (Telegram usernames are ASCII; still use case-insensitive comparison for the **mention token** in message text per product spec). If the text does not contain `@<username>` case-insensitively, **return**.
     - Strip **all** occurrences of `@username` from `text` case-insensitively (e.g. global regex with `i` flag, escaping regex metacharacters in `username`), then `.trim()`. If result is empty, **return**.
     - `await ctx.replyWithChatAction("typing")`.
     - Outer `try`: `const response = await this.llm.wrapInPersona(stripped, "chat")`; `await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } })`.
     - `catch`: derive `reason` string (`e instanceof Error ? e.message : String(e)` or project-consistent pattern); `const msg = await this.llm.wrapInPersona(reason, "error")`; `await ctx.reply(msg)` (user requirement: error path is “reply” without `reply_parameters`; optional: add `reply_parameters` for parity with the happy path).
3. Ensure `ctx.message` is narrowed: after early checks, TypeScript should know `ctx.message` exists for `message_id` — use a local `const message = ctx.message` after guards if needed.

## Acceptance criteria

- [ ] File `src/handlers/mention.handler.ts` exists; exports `MentionChatHandler`.
- [ ] Constructor accepts `{ llm: LlmService }`.
- [ ] No mention / no username / empty after strip → silent return (no reply).
- [ ] Happy path: typing → `wrapInPersona(stripped, "chat")` → `ctx.reply(..., { reply_parameters: { message_id: ctx.message.message_id } })`.
- [ ] Error path: `wrapInPersona(reason, "error")` then `ctx.reply(msg)` (threading optional).
- [ ] No new npm dependencies.

## Notes / risks

- **Regex escape:** Usernames can contain underscores; escape `username` before embedding in `RegExp`.
- **`reply_parameters`:** Requires `ctx.message` — already guaranteed after text guard; use same `message_id` in catch block.
- **Double handler:** See [overview](./00-overview.md) — messages with both mention and URL may invoke both handlers; do not add summary-side guards (out of scope).
