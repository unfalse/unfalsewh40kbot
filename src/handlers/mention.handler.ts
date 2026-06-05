import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { PreferencesService } from "../services/preferences.service";
import type { ConversationService } from "../services/conversation.service";
import { messages, t } from "../config/messages";

export class MentionHandler {
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;
  private readonly conversation: ConversationService;

  constructor(deps: { llm: LlmService; prefs: PreferencesService; conversation: ConversationService }) {
    this.llm = deps.llm;
    this.prefs = deps.prefs;
    this.conversation = deps.conversation;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text;
    if (!text) return;

    const me = ctx.me;
    if (!me?.username) return;

    if (!text.toLowerCase().includes("@" + me.username.toLowerCase())) return;

    const escaped = me.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = text
      .replace(new RegExp(`@${escaped}`, "gi"), "")
      .replace(/\s+/g, " ")
      .trim();

    const messageId = ctx.message!.message_id;
    const userId = ctx.from?.id ?? 0;
    const lang = this.prefs.getLanguage(userId);

    if (!stripped) {
      await ctx.reply(t(messages.handlers.mention.empty, lang), {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const history = this.conversation.getHistory(userId);
      const sysEnabled = this.prefs.getSystemPromptEnabled(userId);
      const result = await this.llm.wrapInPersona(stripped, "chat", lang, history, sysEnabled);
      this.conversation.push(userId, "user", stripped);
      this.conversation.push(userId, "assistant", result);
      await ctx.reply(result, {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[MentionHandler] LLM error:", reason);
      const errMsg = await this.llm.wrapInPersona(
        `Сбой при обработке обращения: ${reason}`,
        "error",
        lang,
      );
      await ctx.reply(errMsg, {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
    }
  }
}
