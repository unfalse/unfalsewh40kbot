# Subtask 02: Create `WhaskCommandHandler`

## Plan links
- [Plan overview](./00-overview.md)
- Depends on: [01 — Add `"whask"` persona to LLM service](./01-llm-persona.md)
- Next: [03 — Register `/whask` in HandlerRegistry](./03-registry.md)

## Objective
Create `src/handlers/whask.handler.ts` — a handler class that mirrors the structure of `AskCommandHandler` but calls `wrapInPersona` with `"whask"` and uses WH40k-flavoured empty-input and error messages.

## Context
- Reference implementation: `src/handlers/ask.handler.ts`
- The handler receives a grammY `Context`, extracts the user query, calls `this.llm.wrapInPersona(query, "whask")`, and replies.
- The empty-input reply and error reply should be in Russian, optionally with light WH40k flavour to stay consistent.

## Steps

1. **Create** `src/handlers/whask.handler.ts` with the following content:

```typescript
import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";

export class WhaskCommandHandler {
  private readonly llm: LlmService;

  constructor(deps: { llm: LlmService }) {
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const query = text.replace(/^\/whask(@\w+)?\s*/i, "").trim();
    const messageId = ctx.message?.message_id;

    if (!query) {
      await ctx.reply(
        "Лексмеханик ждёт запроса. Пример: /whask почему небо синее?",
        messageId ? { reply_parameters: { message_id: messageId } } : {},
      );
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "whask");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId } } : {});
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[WhaskHandler] error:", reason);
      await ctx.reply(
        "Дух Машины не отвечает на бинарные молитвы. Попробуй позже.",
        messageId ? { reply_parameters: { message_id: messageId } } : {},
      );
    }
  }
}
```

## Acceptance criteria
- [ ] File `src/handlers/whask.handler.ts` exists.
- [ ] Class is named `WhaskCommandHandler` and exported as a named export.
- [ ] The regex strips `/whask` and optional `@botname` prefix correctly.
- [ ] Empty query triggers the Russian fallback message.
- [ ] Errors are caught, logged to `console.error`, and a WH40k-flavoured fallback is sent to the user.
- [ ] No TypeScript errors introduced.

## Notes / risks
- The error message deliberately echoes the existing `LEX_SYSTEM` fallback wording ("Дух Машины… бинарные молитвы") for tonal consistency.
- Do not use `ctx.message!.message_id` (non-null assertion) — use the `messageId` variable with a conditional, matching the style in `ask.handler.ts`.
