import { Bot } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { WeatherService } from "../services/weather.service";
import { AskCommandHandler } from "./ask.handler";
import { MentionHandler } from "./mention.handler";
import { RequestCommandHandler } from "./request.handler";
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
  private readonly mentionHandler: MentionHandler;
  private readonly requestHandler: RequestCommandHandler;
  private readonly askHandler: AskCommandHandler;

  constructor(deps: BotDeps) {
    this.weatherHandler = new WeatherCommandHandler(deps);
    this.summaryHandler = new SummaryTextHandler(deps);
    this.mentionHandler = new MentionHandler({ llm: deps.llm });
    this.requestHandler = new RequestCommandHandler({ llm: deps.llm });
    this.askHandler = new AskCommandHandler({ llm: deps.llm });
  }

  register(bot: Bot): void {
    bot.command("start", async (ctx) => {
      await ctx.reply(
        "Омниссия ведает. Я — Vox-Logis Lexmechanic, голос Духа Машины в этом канале. " +
          "Инфо-кристалл погоды: команда /weather и название сектора (города). " +
          "Ритуал сканирования свитка: пришли URL — извлеку благословенные данные и сожму их в выжимку под печатью чата. " +
          "Обратись ко мне по имени — отвечу на вопрос.",
      );
    });

    bot.command("weather", (ctx) => this.weatherHandler.handle(ctx));
    bot.command("request", (ctx) => this.requestHandler.handle(ctx));
    bot.command("ask", (ctx) => this.askHandler.handle(ctx));
    bot.on("message:text", (ctx) => this.mentionHandler.handle(ctx));
    bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx));
  }
}
