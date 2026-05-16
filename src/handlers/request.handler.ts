import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { PreferencesService } from "../services/preferences.service";
import { messages, t, fmt } from "../config/messages";

export class RequestCommandHandler {
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;

  constructor(deps: { llm: LlmService; prefs: PreferencesService }) {
    this.llm = deps.llm;
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const query = text.replace(/^\/request(@\w+)?\s*/i, "").trim();
    const messageId = ctx.message?.message_id;
    const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);

    if (!query) {
      const msg = await this.llm.wrapInPersona(
        t(messages.handlers.request.empty_query_prompt, lang),
        "error",
        lang,
      );
      await ctx.reply(msg, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(query, "chat", lang);
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const errMsg = await this.llm.wrapInPersona(
        fmt(t(messages.handlers.request.error_prefix, lang), { reason }),
        "error",
        lang,
      );
      await ctx.reply(errMsg, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    }
  }
}
