import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import { messages, fmt } from "../config/messages";

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
        messages.handlers.request.empty_query_prompt,
        "error",
      );
      await ctx.reply(msg, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "chat");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const errMsg = await this.llm.wrapInPersona(
        fmt(messages.handlers.request.error_prefix, { reason }),
        "error",
      );
      await ctx.reply(errMsg, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    }
  }
}
