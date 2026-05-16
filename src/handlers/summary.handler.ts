import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { PreferencesService } from "../services/preferences.service";
import { UrlUtil } from "../util/url";
import { messages, t, fmt } from "../config/messages";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export class SummaryTextHandler {
  private readonly parser: ParserService;
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;

  constructor(deps: { parser: ParserService; llm: LlmService; prefs: PreferencesService }) {
    this.parser = deps.parser;
    this.llm = deps.llm;
    this.prefs = deps.prefs;
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

    const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);

    try {
      UrlUtil.assertPublicHttpUrl(first);
    } catch {
      const msg = await this.llm.wrapInPersona(
        t(messages.handlers.summary.private_url_prompt, lang),
        "error",
        lang,
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const { title, text: body } = await this.parser.parseUrl(first);
      const bundle = `Заголовок страницы: ${title}\n\nТекст:\n${body}`;
      const bullets = await this.llm.wrapInPersona(bundle, "summary", lang);
      await ctx.reply(`<b>${escapeHtml(title)}</b>\n\n${bullets}`, { parse_mode: "HTML" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const msg = await this.llm.wrapInPersona(
        fmt(t(messages.handlers.summary.parse_error_prefix, lang), { reason }),
        "error",
        lang,
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
    }
  }
}
