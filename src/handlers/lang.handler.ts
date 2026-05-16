import type { Context } from "grammy";
import type { PreferencesService, Language } from "../services/preferences.service";
import { messages, t } from "../config/messages";

export class LangCommandHandler {
  private readonly prefs: PreferencesService;

  constructor(deps: { prefs: PreferencesService }) {
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const arg = text.replace(/^\/lang(@\w+)?\s*/i, "").trim().toLowerCase();
    const userId = ctx.from?.id;
    if (!userId) return;

    if (arg !== "ru" && arg !== "en") {
      const currentLang = this.prefs.getLanguage(userId);
      await ctx.reply(t(messages.handlers.lang.usage, currentLang), { parse_mode: "HTML" });
      return;
    }

    const newLang = arg as Language;
    this.prefs.setLanguage(userId, newLang);
    const confirmation = newLang === "en" ? messages.handlers.lang.set_en : messages.handlers.lang.set_ru;
    await ctx.reply(t(confirmation, newLang), { parse_mode: "HTML" });
  }
}
