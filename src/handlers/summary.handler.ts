import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import { UrlUtil } from "../util/url";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

    const username = ctx.me?.username;
    if (username && text.toLowerCase().includes("@" + username.toLowerCase())) return;

    const entities = ctx.message?.entities;
    const urls = UrlUtil.collectUrlsFromMessage(text, entities);
    const first = urls[0] ?? UrlUtil.extractFirstHttpUrl(text);
    if (!first) return;

    try {
      UrlUtil.assertPublicHttpUrl(first);
    } catch {
      const msg = await this.llm.wrapInPersona(
        "Пользователь передал URL, заблокированный системой безопасности: localhost или приватная сеть.",
        "error",
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const { title, text: body } = await this.parser.parseUrl(first);
      const bundle = `Заголовок страницы: ${title}\n\nТекст:\n${body}`;
      const bullets = await this.llm.wrapInPersona(bundle, "summary");

      const html = `<b>${escapeHtml(title)}</b>\n\n${bullets}`;

      await ctx.reply(html, { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const msg = await this.llm.wrapInPersona(
        `Не удалось обработать ссылку. Причина: ${reason}`,
        "error",
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
    }
  }
}
