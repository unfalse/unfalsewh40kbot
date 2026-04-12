import { Bot } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { WeatherService } from "../services/weather.service";
import { createSummaryTextHandler } from "./summary.handler";
import { createWeatherCommandHandler } from "./weather.handler";

export type BotDeps = {
  weather: WeatherService;
  llm: LlmService;
  parser: ParserService;
};

export function registerHandlers(bot: Bot, deps: BotDeps): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Омниссия ведает. Я — Vox-Logis Lexmechanic, голос Духа Машины в этом канале. " +
        "Инфо-кристалл погоды: команда /weather и название сектора (города). " +
        "Ритуал сканирования свитка: пришли URL — извлеку благословенные данные и сожму их в выжимку под печатью чата.",
    );
  });

  bot.command("weather", createWeatherCommandHandler(deps));
  bot.on("message:text", createSummaryTextHandler(deps));
}
