import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import { escapeMarkdownV2 } from "../util/markdownv2";
import { assertPublicHttpUrl, collectUrlsFromMessage, extractFirstHttpUrl } from "../util/url";

export function createSummaryTextHandler(deps: { parser: ParserService; llm: LlmService }) {
  return async (ctx: Context) => {
    const text = ctx.message?.text;
    if (!text || text.trimStart().startsWith("/")) return;

    const entities = ctx.message?.entities;
    const urls = collectUrlsFromMessage(text, entities);
    const first = urls[0] ?? extractFirstHttpUrl(text);
    if (!first) return;

    try {
      assertPublicHttpUrl(first);
    } catch {
      const msg = await deps.llm.wrapInPersona(
        "Пользователь прислал URL, который схема безопасности культа отклонила (localhost, приватная сеть и т.п.).",
        "error",
      );
      await ctx.reply(msg);
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const { title, text: body } = await deps.parser.parseUrl(first);
      const bundle = `Заголовок страницы: ${title}\n\nТекст:\n${body}`;
      const bullets = await deps.llm.wrapInPersona(bundle, "summary");

      const md =
        `*${escapeMarkdownV2(title)}*\n\n` +
        `||${escapeMarkdownV2(bullets)}||`;

      await ctx.reply(md, { parse_mode: "MarkdownV2" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      const msg = await deps.llm.wrapInPersona(
        `Не удалось выполнить ритуал Cogitator Summary по ссылке. Причина: ${reason}`,
        "error",
      );
      await ctx.reply(msg);
    }
  };
}
