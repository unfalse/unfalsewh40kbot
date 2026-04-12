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
    const from = ctx.message?.from;
    const chatId = ctx.message?.chat.id;
    console.log("[MentionHandler] incoming", { from: from?.username ?? from?.id, chatId, text });

    if (!text) return;

    const me = ctx.me;
    if (!me?.username) return;

    if (!text.toLowerCase().includes("@" + me.username.toLowerCase())) {
      console.log("[MentionHandler] no mention, skipping");
      return;
    }

    const escaped = me.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = text
      .replace(new RegExp(`@${escaped}`, "gi"), "")
      .replace(/\s+/g, " ")
      .trim();

    console.log("[MentionHandler] mention detected, stripped prompt:", JSON.stringify(stripped));

    const messageId = ctx.message!.message_id;

    if (!stripped) {
      console.log("[MentionHandler] empty prompt, sending static reply");
      await ctx.reply(EMPTY_MENTION_REPLY, {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const result = await this.llm.wrapInPersona(stripped, "chat");
      console.log("[MentionHandler] LLM reply:", JSON.stringify(result));
      await ctx.reply(result, {
        reply_parameters: { message_id: messageId },
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
      });
    }
  }
}
