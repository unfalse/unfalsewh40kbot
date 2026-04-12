# Plan: Mention-chat (Lexmechanicus replies to @bot mentions)

## Objective

When a user tags the bot by `@username` in a group (or private) text message, the bot strips that mention, runs the remaining text through `LlmService.wrapInPersona` with context `'chat'`, shows a typing action, and replies **threaded to the user’s message** via `reply_parameters`. Failures are surfaced through the existing `'error'` persona path.

## Scope

- **In scope:** `PersonaContext` extension; `TOKENS` / `TEMPERATURE` / `userInstructionFor` for `chat`; new `MentionChatHandler` in `src/handlers/mention.handler.ts`; `HandlerRegistry` wiring with mention listener **before** the summary listener; `npm run build` passing.
- **Out of scope:** New npm packages; changes to `SummaryTextHandler`, `WeatherCommandHandler`, or other handler **logic** (only registry wiring); edits to `bot.ts` unless build errors require it (not anticipated).

## Success criteria

- Typing action + `wrapInPersona(..., "chat")` + reply with `reply_parameters.message_id` on valid mention + non-empty stripped text.
- Early return when text or `ctx.me.username` is missing, when no case-insensitive `@username` substring, or when stripped text is empty.
- Try/catch: on failure, `wrapInPersona(reason, "error")` then `ctx.reply` per [02](./02-mention-chat-handler.md) (success path must use `reply_parameters`).
- [01](./01-llm-persona-chat.md): `chat` uses **800** max output tokens and **0.85** temperature; existing `weather` / `summary` / `error` branches remain **verbatim** aside from the required `switch` exhaustiveness update (new `case "chat"` only).

## Subtasks (execution order)

1. [01 — LLM persona: `chat` context](./01-llm-persona-chat.md)
2. [02 — `MentionChatHandler` implementation](./02-mention-chat-handler.md)
3. [03 — Handler registry: field, constructor, listener order](./03-handler-registry-wiring.md)

## Dependency / ordering notes

- [02](./02-mention-chat-handler.md) depends on [01](./01-llm-persona-chat.md) so TypeScript accepts `'chat'` at compile time.
- [03](./03-handler-registry-wiring.md) depends on [02](./02-mention-chat-handler.md) so the class exists to import and instantiate.

## Verification summary

After all subtasks: run `npm run build` from the repo root. Manually (optional): in a group, send `@YourBotName hello` and confirm a threaded Lexmechanicus reply; send a message with a URL but **no** mention and confirm summary behavior unchanged; send `/start` and confirm commands still behave as before.

## Global risks / decisions

- **`ctx.me` availability:** `ctx.me.username` requires bot user info (typically after `getMe`). If `ctx.me` is undefined in an edge case, the handler must return early per spec — do not throw.
- **Coexistence with summary:** Mention handler runs first and no-ops without `@username`; summary still requires a URL. A message that both mentions the bot **and** contains a URL will trigger **both** handlers unless one is changed — user constraint forbids altering summary logic; accept **two replies** for that edge case or document it as known behavior (product decision: leave as-is unless product says otherwise).
- **Strip semantics:** Strip **all** occurrences of `@username` (case-insensitive), then `trim()`; empty remainder → return without replying.
- **No new dependencies:** Use only `RegExp` / string replace for stripping.
