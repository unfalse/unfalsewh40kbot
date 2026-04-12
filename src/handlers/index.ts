import { Bot } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { WeatherService } from "../services/weather.service";
import { SummaryTextHandler } from "./summary.handler";
import { WeatherCommandHandler } from "./weather.handler";

export type BotDeps = {
  weather: WeatherService;
  llm: LlmService;
  parser: ParserService;
};

export class HandlerRegistry {
  private readonly weatherHandler: WeatherCommandHandler;
  private readonly summaryHandler: SummaryTextHandler;

  constructor(deps: BotDeps) {
    this.weatherHandler = new WeatherCommandHandler(deps);
    this.summaryHandler = new SummaryTextHandler(deps);
  }

  register(bot: Bot): void {
    bot.command("start", async (ctx) => {
      await ctx.reply(
        "Омниссия ведает. Я — Vox-Logis Lexmechanic, голос Духа Машины в этом канале. " +
          "Инфо-кристалл погоды: команда /weather и название сектора (города). " +
          "Ритуал сканирования свитка: пришли URL — извлеку благословенные данные и сожму их в выжимку под печатью чата.",
      );
    });

    bot.command("weather", (ctx) => this.weatherHandler.handle(ctx));
    bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx));
  }
}
