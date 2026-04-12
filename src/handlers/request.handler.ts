import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";

export class RequestCommandHandler {
  private readonly llm: LlmService;

  constructor(deps: { llm: LlmService }) {
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const query = text.replace(/^\/request(@\w+)?\s*/i, "").trim();
    const messageId = ctx.message?.message_id;

    if (!query) {
      const msg = await this.llm.wrapInPersona(
        "Пользователь вызвал /request без текста обращения.",
        "error",
      );
      await ctx.reply(msg, messageId ? { reply_parameters: { message_id: messageId } } : {});
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "chat");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId } } : {});
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const errMsg = await this.llm.wrapInPersona(
        `Сбой при обработке /request: ${reason}`,
        "error",
      );
      await ctx.reply(errMsg, messageId ? { reply_parameters: { message_id: messageId } } : {});
    }
  }
}
