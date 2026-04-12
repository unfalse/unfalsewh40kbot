import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { WeatherService } from "../services/weather.service";

export function createWeatherCommandHandler(deps: {
  weather: WeatherService;
  llm: LlmService;
}) {
  return async (ctx: Context) => {
    const text = ctx.message?.text ?? "";
    const city = text.replace(/^\/weather(@\w+)?\s*/i, "").trim();

    if (!city) {
      const msg = await deps.llm.wrapInPersona(
        "Пользователь вызвал /weather без названия города.",
        "error",
      );
      await ctx.reply(msg);
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const facts = await deps.weather.getCurrentByCity(city);
      const raw = deps.weather.formatFactsForLlm(facts);
      const styled = await deps.llm.wrapInPersona(raw, "weather");
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
      const msg = await deps.llm.wrapInPersona(
        `Сбой при получении погоды: ${reason}`,
        "error",
      );
      await ctx.reply(msg);
    }
  };
}
