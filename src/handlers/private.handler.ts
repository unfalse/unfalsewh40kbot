import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import { UrlUtil } from "../util/url";
import { messages } from "../config/messages";

export class PrivateChatHandler {
  private readonly llm: LlmService;

  constructor(deps: { llm: LlmService }) {
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    if (ctx.chat?.type !== "private") return;

    const text = ctx.message?.text;
    if (!text || text.trimStart().startsWith("/")) return;

    const username = ctx.me?.username;
    if (username && text.toLowerCase().includes("@" + username.toLowerCase())) return;

    const entities = ctx.message?.entities;
    const urls = UrlUtil.collectUrlsFromMessage(text, entities);
    if (urls.length > 0 || UrlUtil.extractFirstHttpUrl(text)) return;

    const messageId = ctx.message?.message_id;

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(text, "whask");
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[PrivateChatHandler] error:", reason);
      await ctx.reply(
        messages.handlers.whask.error,
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
    }
  }
}
