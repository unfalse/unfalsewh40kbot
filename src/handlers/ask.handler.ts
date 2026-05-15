import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import { messages } from "../config/messages";

export class AskCommandHandler {
  private readonly llm: LlmService;

  constructor(deps: { llm: LlmService }) {
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const query = text.replace(/^\/ask(@\w+)?\s*/i, "").trim();
    const messageId = ctx.message?.message_id;

    if (!query) {
      await ctx.reply(
        messages.handlers.ask.empty_query,
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "plain");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[AskHandler] error:", reason);
      await ctx.reply(
        messages.handlers.ask.error,
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
    }
  }
}
