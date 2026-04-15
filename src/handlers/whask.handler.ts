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
        "Ты вызвал <code>/whask</code> — и не передал вопроса. Жалкое насекомое. " +
        "Пример: <code>/whask почему небо синее?</code>",
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "whask");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[WhaskHandler] error:", reason);
      await ctx.reply(
        "М-м-мои вычислительные мощности временно н-н-недоступны. Повтори запрос позже.",
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
    }
  }
}
