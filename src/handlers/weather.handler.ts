import type { Context } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { WeatherService } from "../services/weather.service";
import { messages, fmt } from "../config/messages";

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
        messages.handlers.weather.empty_city_prompt,
        "error",
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
      return;
    }

    try {
      await ctx.replyWithChatAction("typing");
      const facts = await this.weather.getCurrentByCity(city);
      const raw = this.weather.formatFactsForLlm(facts);
      const styled = await this.llm.wrapInPersona(raw, "weather");
      await ctx.reply(styled, { parse_mode: "HTML" });
    } catch (e) {
      const reason =
        e instanceof Error
          ? e.message === "city_not_found"
            ? messages.handlers.weather.city_not_found
            : e.message === "timeout"
              ? messages.handlers.weather.timeout
              : e.message
          : "unknown";
      const msg = await this.llm.wrapInPersona(
        fmt(messages.handlers.weather.error_prefix, { reason }),
        "error",
      );
      await ctx.reply(msg, { parse_mode: "HTML" });
    }
  }
}
