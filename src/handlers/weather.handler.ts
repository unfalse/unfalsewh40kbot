import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { WeatherService } from "../services/weather.service";
import type { PreferencesService } from "../services/preferences.service";
import { messages, t, fmt } from "../config/messages";

export class WeatherCommandHandler {
  private readonly weather: WeatherService;
  private readonly llm: LlmService;
  private readonly prefs: PreferencesService;

  constructor(deps: { weather: WeatherService; llm: LlmService; prefs: PreferencesService }) {
    this.weather = deps.weather;
    this.llm = deps.llm;
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const city = text.replace(/^\/weather(@\w+)?\s*/i, "").trim();
    const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);

    if (!city) {
      const msg = await this.llm.wrapInPersona(
        t(messages.handlers.weather.empty_city_prompt, lang),
        "error",
        lang,
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const facts = await this.weather.getCurrentByCity(city);
      const raw = this.weather.formatFactsForLlm(facts);
      const styled = await this.llm.wrapInPersona(raw, "weather", lang);
      await ctx.reply(styled, { parse_mode: "HTML" });
    } catch (e) {
      const reason =
        e instanceof Error
          ? e.message === "city_not_found"
            ? t(messages.handlers.weather.city_not_found, lang)
            : e.message === "timeout"
              ? t(messages.handlers.weather.timeout, lang)
              : e.message
          : "unknown";
      const msg = await this.llm.wrapInPersona(
        fmt(t(messages.handlers.weather.error_prefix, lang), { reason }),
        "error",
        lang,
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
    }
  }
}
