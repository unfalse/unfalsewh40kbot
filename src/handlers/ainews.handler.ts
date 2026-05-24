import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { PreferencesService } from "../services/preferences.service";
import { messages, t } from "../config/messages";

export class AiNewsCommandHandler {
  private readonly parser: ParserService;
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;

  constructor(deps: { parser: ParserService; llm: LlmService; prefs: PreferencesService }) {
    this.parser = deps.parser;
    this.llm = deps.llm;
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);

    try {
      await ctx.replyWithChatAction("typing");

      const stories = await this.parser.fetchHnAiNews();
      if (!stories.length) {
        await ctx.reply(t(messages.handlers.ainews.no_results, lang), { parse_mode: "HTML" });
        return;
      }

      const newsText = stories
        .map((s) => `<b>${s.title}</b> (${s.score} points)\n<a href="${s.url}">Read more</a>`)
        .join("\n\n");

      const summary = await this.llm.wrapInPersona(newsText, "ainews", lang);

      // Добавляем список ссылок в конце сводки
      const links = stories.map((s) => `<a href="${s.url}">${s.title}</a>`).join("\n");
      const finalMessage = `${summary}\n\n<b>Sources:</b>\n${links}`;

      await ctx.reply(finalMessage, { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      console.error("[AiNewsHandler] error:", reason);
      const errMsg = await this.llm.wrapInPersona(
        `Сбой при получении новостей: ${reason}`,
        "error",
        lang,
      );
      await ctx.reply(errMsg, { parse_mode: "HTML" });
    }
  }
}
