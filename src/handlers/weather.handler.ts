import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { WeatherService } from "../services/weather.service";

export class WeatherCommandHandler {
  private readonly weather: WeatherService;
  private readonly llm: LlmService;

  constructor(deps: { weather: WeatherService; llm: LlmService }) {
    this.weather = deps.weather;
    this.llm = deps.llm;
  }

  async handle(ctx: Context): Promise<void> {
    const text = ctx.message?.text ?? "";
    const city = text.replace(/^\/weather(@\w+)?\s*/i, "").trim();

    if (!city) {
      const msg = await this.llm.wrapInPersona(
        "Пользователь вызвал /weather без названия города.",
        "error",
      );
      await ctx.reply(msg);
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const facts = await this.weather.getCurrentByCity(city);
      const raw = this.weather.formatFactsForLlm(facts);
      const styled = await this.llm.wrapInPersona(raw, "weather");
      await ctx.reply(styled);
    } catch (e) {
      const reason =
        e instanceof Error
          ? e.message === "city_not_found"
            ? "Город не найден в благословенных картах OpenWeatherMap."
            : e.message === "timeout"
              ? "Таймаут при обращении к алтарю погоды."
              : e.message
          : "unknown";
      const msg = await this.llm.wrapInPersona(
        `Сбой при получении погоды: ${reason}`,
        "error",
      );
      await ctx.reply(msg);
    }
  }
}
