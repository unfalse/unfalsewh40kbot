import "dotenv/config";
import { createServer } from "node:http";
import { Bot, GrammyError, HttpError } from "grammy";
import { HandlerRegistry } from "./handlers/index";
import { GeminiLlmService } from "./services/llm.service";
import { OllamaLlmService } from "./services/ollama.service";
import type { LlmService } from "./services/llm.service";
import { HttpParserService } from "./services/parser.service";
import { OpenWeatherService } from "./services/weather.service";
import { PreferencesService } from "./services/preferences.service";
import { messages } from "./config/messages";

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

  private static createLlm(): LlmService {
    const backend = process.env["LLM"]?.trim() ?? "gemini";
    if (backend === "localhost:11434") {
      console.error("[LLM] Используется локальный бэкенд Ollama: http://localhost:11434");
      return new OllamaLlmService("http://localhost:11434");
    }
    const geminiKey = VoxLogisBot.requireEnv("GEMINI_API_KEY");
    console.error("[LLM] Используется Gemini API");
    return new GeminiLlmService(geminiKey);
  }

  async start(): Promise<void> {
    const token = VoxLogisBot.requireEnv("TELEGRAM_BOT_TOKEN");
    const openWeatherKey = VoxLogisBot.requireEnv("OPENWEATHER_API_KEY");

    const bot = new Bot(token);
    const llm = VoxLogisBot.createLlm();
    const weather = new OpenWeatherService(openWeatherKey);
    const parser = new HttpParserService();

    const prefs = new PreferencesService();
    new HandlerRegistry({ llm, weather, parser, prefs }).register(bot);

    bot.catch(async (err) => {
      const cause = err.error;

      if (cause instanceof GrammyError && cause.error_code === 403) return;

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
        // если reply тоже упал — молча игнорируем, пользователь недоступен
      }
    });

    this.startHealthServer();
    console.error(messages.meta.startup_log);
    await bot.start();
  }
}

new VoxLogisBot().start().catch((e) => {
  console.error(e);
  process.exit(1);
});

