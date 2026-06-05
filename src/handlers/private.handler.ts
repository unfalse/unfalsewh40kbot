import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { PreferencesService } from "../services/preferences.service";
import type { ConversationService } from "../services/conversation.service";
import { UrlUtil } from "../util/url";
import { messages, t } from "../config/messages";

export class PrivateChatHandler {
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;
  private readonly conversation: ConversationService;

  constructor(deps: { llm: LlmService; prefs: PreferencesService; conversation: ConversationService }) {
    this.llm = deps.llm;
    this.prefs = deps.prefs;
    this.conversation = deps.conversation;
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
    const userId = ctx.from?.id ?? 0;
    const lang = this.prefs.getLanguage(userId);

    try {
      await ctx.replyWithChatAction("typing");
      const history = this.conversation.getHistory(userId);
      const sysEnabled = this.prefs.getSystemPromptEnabled(userId);
      const result = await this.llm.wrapInPersona(text, "whask", lang, history, sysEnabled);
      this.conversation.push(userId, "user", text);
      this.conversation.push(userId, "assistant", result);
      await ctx.reply(result, messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[PrivateChatHandler] error:", reason);
      await ctx.reply(
        t(messages.handlers.whask.error, lang),
        messageId ? { reply_parameters: { message_id: messageId }, parse_mode: "HTML" } : { parse_mode: "HTML" },
      );
    }
  }
}
