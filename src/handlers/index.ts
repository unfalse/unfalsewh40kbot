import { Bot } from "grammy";
import type { LlmService } from "../services/llm.service";
import type { ParserService } from "../services/parser.service";
import type { WeatherService } from "../services/weather.service";
import type { PreferencesService } from "../services/preferences.service";
import type { ConversationService } from "../services/conversation.service";
import { messages, t } from "../config/messages";
import { AiNewsCommandHandler } from "./ainews.handler";
import { AskCommandHandler } from "./ask.handler";
import { LangCommandHandler } from "./lang.handler";
import { ToggleCommandHandler } from "./toggle.handler";
import { MentionHandler } from "./mention.handler";
import { PrivateChatHandler } from "./private.handler";
import { ReplyHandler } from "./reply.handler";
import { WhaskCommandHandler } from "./whask.handler";
import { RequestCommandHandler } from "./request.handler";
import { SummaryTextHandler } from "./summary.handler";
import { WeatherCommandHandler } from "./weather.handler";

export type BotDeps = {
  weather: WeatherService;
  llm: LlmService;
  parser: ParserService;
  prefs: PreferencesService;
  conversation: ConversationService;
};

export class HandlerRegistry {
  private readonly weatherHandler: WeatherCommandHandler;
  private readonly summaryHandler: SummaryTextHandler;
  private readonly mentionHandler: MentionHandler;
  private readonly requestHandler: RequestCommandHandler;
  private readonly askHandler: AskCommandHandler;
  private readonly whaskHandler: WhaskCommandHandler;
  private readonly aiNewsHandler: AiNewsCommandHandler;
  private readonly replyHandler: ReplyHandler;
  private readonly privateChatHandler: PrivateChatHandler;
  private readonly langHandler: LangCommandHandler;
  private readonly toggleHandler: ToggleCommandHandler;
  private readonly prefs: PreferencesService;

  constructor(deps: BotDeps) {
    this.prefs = deps.prefs;
    this.weatherHandler = new WeatherCommandHandler(deps);
    this.summaryHandler = new SummaryTextHandler(deps);
    this.mentionHandler = new MentionHandler(deps);
    this.requestHandler = new RequestCommandHandler(deps);
    this.askHandler = new AskCommandHandler(deps);
    this.whaskHandler = new WhaskCommandHandler(deps);
    this.aiNewsHandler = new AiNewsCommandHandler(deps);
    this.replyHandler = new ReplyHandler(deps);
    this.privateChatHandler = new PrivateChatHandler(deps);
    this.langHandler = new LangCommandHandler(deps);
    this.toggleHandler = new ToggleCommandHandler(deps);
  }

  register(bot: Bot): void {
    bot.command("start", async (ctx) => {
      const lang = this.prefs.getLanguage(ctx.from?.id ?? 0);
      await ctx.reply(t(messages.meta.start_command, lang).trim(), { parse_mode: "HTML" });
    });

    bot.command("weather", (ctx) => this.weatherHandler.handle(ctx));
    bot.command("request", (ctx) => this.requestHandler.handle(ctx));
    bot.command("ask", (ctx) => this.askHandler.handle(ctx));
    bot.command("whask", (ctx) => this.whaskHandler.handle(ctx));
    bot.command("ainews", (ctx) => this.aiNewsHandler.handle(ctx));
    bot.command("lang", (ctx) => this.langHandler.handle(ctx));
    bot.command("toggle", (ctx) => this.toggleHandler.handle(ctx));
    bot.on("message:text", async (ctx) => {
      await this.replyHandler.handle(ctx);
      await this.mentionHandler.handle(ctx);
      await this.summaryHandler.handle(ctx);
      await this.privateChatHandler.handle(ctx);
    });
  }
}
