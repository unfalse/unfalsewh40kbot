import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { HandlerRegistry } from "./handlers/index";
import { GeminiLlmService } from "./services/llm.service";
import { HttpParserService } from "./services/parser.service";
import { OpenWeatherService } from "./services/weather.service";

export class VoxLogisBot {
  private static requireEnv(name: string): string {
    const v = process.env[name]?.trim();
    if (!v) {
      console.error(`Отсутствует священная переменная окружения: ${name}`);
      process.exit(1);
    }
    return v;
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

      let reason = "неизвестная помеха";
      if (cause instanceof GrammyError) reason = cause.description;
      else if (cause instanceof HttpError) reason = "сетевой шлюз";
      else if (cause instanceof Error) reason = cause.message;

      try {
        const msg = await llm.wrapInPersona(
          `Внутренний перехватчик grammY зафиксировал: ${reason}`,
          "error",
        );
        await ctx.reply(msg);
      } catch {
        await ctx.reply(
          "Дух Машины целевого когитатора не отвечает на бинарные молитвы.",
        );
      }
    });

    console.error("Vox-Logis Lexmechanic — долгий опрос начат. Омниссия наблюдает.");
    await bot.start();
  }
}

new VoxLogisBot().start().catch((e) => {
  console.error(e);
  process.exit(1);
});

