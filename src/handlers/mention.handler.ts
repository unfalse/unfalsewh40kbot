import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";

const EMPTY_MENTION_REPLY =
  "Благословенные данные получены. Ты вызвал Лексмеханика — но не сообщил цели ритуала. " +
  "Передай запрос, смертный.";

export class MentionHandler {
  private readonly llm: LlmService;

  constructor(deps: { llm: LlmService }) {
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text;

    if (!text) return;

    const me = ctx.me;
    if (!me?.username) return;

    if (!text.toLowerCase().includes("@" + me.username.toLowerCase())) {
      return;
    }

    const escaped = me.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = text
      .replace(new RegExp(`@${escaped}`, "gi"), "")
      .replace(/\s+/g, " ")
      .trim();

    const messageId = ctx.message!.message_id;

    if (!stripped) {
      await ctx.reply(EMPTY_MENTION_REPLY, {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(stripped, "chat");
      await ctx.reply(result, {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[MentionHandler] LLM error:", reason);
      const errMsg = await this.llm.wrapInPersona(
        `Сбой при обработке обращения к Лексмеханику: ${reason}`,
        "error",
      );
      await ctx.reply(errMsg, {
        reply_parameters: { message_id: messageId },
        parse_mode: "HTML",
      });
    }
  }
}
