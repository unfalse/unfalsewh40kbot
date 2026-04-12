import "dotenv/config";
import { Bot, GrammyError, HttpError } from "grammy";
import { registerHandlers } from "./handlers/index";
import { createLlmService } from "./services/llm.service";
import { createParserService } from "./services/parser.service";
import { createWeatherService } from "./services/weather.service";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Отсутствует священная переменная окружения: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main(): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const openWeatherKey = requireEnv("OPENWEATHER_API_KEY");
  const openAiKey = requireEnv("OPENAI_API_KEY");

  const bot = new Bot(token);
  const llm = createLlmService(openAiKey);
  const weather = createWeatherService(openWeatherKey);
  const parser = createParserService();

  registerHandlers(bot, { llm, weather, parser });

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
