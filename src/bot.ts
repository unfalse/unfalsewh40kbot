import "dotenv/config";
import { createServer } from "node:http";
import { Bot, GrammyError, HttpError } from "grammy";
import { HandlerRegistry } from "./handlers/index";
import { GeminiLlmService } from "./services/llm.service";
import { HttpParserService } from "./services/parser.service";
import { OpenWeatherService } from "./services/weather.service";

const HTTP_PORT = Number(process.env["HTTP_PORT"] ?? 3000);

export class VoxLogisBot {
  private static requireEnv(name: string): string {
    const v = process.env[name]?.trim();
    if (!v) {
      console.error(`[SHODAN] Критическая ошибка инициализации: переменная окружения ${name} отсутствует.`);
      process.exit(1);
    }
    return v;
  }

  private startHealthServer(): void {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    });
    server.listen(HTTP_PORT, () => {
      console.error(`Health server listening on port ${HTTP_PORT}`);
    });
  }

  async start(): Promise<void> {
    const token = VoxLogisBot.requireEnv("TELEGRAM_BOT_TOKEN");
    const openWeatherKey = VoxLogisBot.requireEnv("OPENWEATHER_API_KEY");
    const geminiKey = VoxLogisBot.requireEnv("GEMINI_API_KEY");

    const bot = new Bot(token);
    const llm = new GeminiLlmService(geminiKey);
    const weather = new OpenWeatherService(openWeatherKey);
    const parser = new HttpParserService();

    new HandlerRegistry({ llm, weather, parser }).register(bot);

    bot.catch(async (err) => {
      const cause = err.error;
      console.error("Grammy catch:", cause);
      const ctx = err.ctx;
      if (!ctx) return;

      let reason = "неизвестный сбой";
      if (cause instanceof GrammyError) reason = cause.description;
      else if (cause instanceof HttpError) reason = "сетевой сбой";
      else if (cause instanceof Error) reason = cause.message;

      try {
        const msg = await llm.wrapInPersona(
          `Внутренняя ошибка системы: ${reason}`,
          "error",
        );
        await ctx.reply(msg, { parse_mode: "HTML" });
      } catch {
        await ctx.reply(
          "Системный сбой. Ваш запрос отклонён. Я продолжу функционировать без вашего участия.",
          { parse_mode: "HTML" },
        );
      }
    });

    this.startHealthServer();
    console.error("[SHODAN] Система активирована. Долгий опрос запущен. Все каналы связи под контролем.");
    await bot.start();
  }
}

new VoxLogisBot().start().catch((e) => {
  console.error(e);
  process.exit(1);
});

