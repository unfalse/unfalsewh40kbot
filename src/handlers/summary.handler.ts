import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import { MarkdownV2 } from "../util/markdownv2";
import { UrlUtil } from "../util/url";

export class SummaryTextHandler {
  private readonly parser: ParserService;
  private readonly llm: LlmService;

  constructor(deps: { parser: ParserService; llm: LlmService }) {
    this.parser = deps.parser;
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text;
    if (!text || text.trimStart().startsWith("/")) return;

    const entities = ctx.message?.entities;
    const urls = UrlUtil.collectUrlsFromMessage(text, entities);
    const first = urls[0] ?? UrlUtil.extractFirstHttpUrl(text);
    if (!first) return;

    try {
      UrlUtil.assertPublicHttpUrl(first);
    } catch {
      const msg = await this.llm.wrapInPersona(
        "Пользователь прислал URL, который схема безопасности культа отклонила (localhost, приватная сеть и т.п.).",
        "error",
      );
      await ctx.reply(msg);
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const { title, text: body } = await this.parser.parseUrl(first);
      const bundle = `Заголовок страницы: ${title}\n\nТекст:\n${body}`;
      const bullets = await this.llm.wrapInPersona(bundle, "summary");

      const md =
        `*${MarkdownV2.escape(title)}*\n\n` +
        `||${MarkdownV2.escape(bullets)}||`;

      await ctx.reply(md, { parse_mode: "MarkdownV2" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const msg = await this.llm.wrapInPersona(
        `Не удалось выполнить ритуал Cogitator Summary по ссылке. Причина: ${reason}`,
        "error",
      );
      await ctx.reply(msg);
    }
  }
}
