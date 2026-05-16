import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { PreferencesService } from "../services/preferences.service";
import { messages, t } from "../config/messages";

export class WhaskCommandHandler {
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;

  constructor(deps: { llm: LlmService; prefs: PreferencesService }) {
    this.llm = deps.llm;
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const query = text.replace(/^\/whask(@\w+)?\s*/i, "").trim();
    const messageId = ctx.message?.message_id;
    const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);

    if (!query) {
      await ctx.reply(
        t(messages.handlers.whask.empty_query, lang),
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "whask", lang);
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[WhaskHandler] error:", reason);
      await ctx.reply(
        t(messages.handlers.whask.error, lang),
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
    }
  }
}
