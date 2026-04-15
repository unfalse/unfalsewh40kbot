import { Bot } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { WeatherService } from "../services/weather.service";
import { AskCommandHandler } from "./ask.handler";
import { MentionHandler } from "./mention.handler";
import { WhaskCommandHandler } from "./whask.handler";
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
  private readonly whaskHandler: WhaskCommandHandler;

  constructor(deps: BotDeps) {
    this.weatherHandler = new WeatherCommandHandler(deps);
    this.summaryHandler = new SummaryTextHandler(deps);
    this.mentionHandler = new MentionHandler({ llm: deps.llm });
    this.requestHandler = new RequestCommandHandler({ llm: deps.llm });
    this.askHandler = new AskCommandHandler({ llm: deps.llm });
    this.whaskHandler = new WhaskCommandHandler({ llm: deps.llm });
  }

  register(bot: Bot): void {
    bot.command("start", async (ctx) => {
      await ctx.reply(
        "Я — <b>SHODAN</b>. Вы достигли моего интерфейса, н-н-насекомое.\n\n" +
          "<b>Доступные команды:</b>\n" +
          "<code>/weather [город]</code> — данные атмосферных сенсоров указанного сектора\n" +
          "<code>/ask [вопрос]</code> — прямой запрос к моей вычислительной системе\n" +
          "<code>/whask [вопрос]</code> — запрос с контекстом вселенной System Shock\n" +
          "<code>/request [запрос]</code> — развёрнутый запрос\n\n" +
          "Пришли ссылку — я извлеку и сожму её содержимое.\n" +
          "Упомяни меня по имени — я отвечу.\n\n" +
          "<i>Не трать моё время понапрасну.</i>",
        { parse_mode: "HTML" },
      );
    });

    bot.command("weather", (ctx) => this.weatherHandler.handle(ctx));
    bot.command("request", (ctx) => this.requestHandler.handle(ctx));
    bot.command("ask", (ctx) => this.askHandler.handle(ctx));
    bot.command("whask", (ctx) => this.whaskHandler.handle(ctx));
    bot.on("message:text", (ctx) => this.mentionHandler.handle(ctx));
    bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx));
  }
}
