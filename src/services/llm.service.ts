import { GoogleGenAI } from "@google/genai";

export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask";

export interface LlmService {
  wrapInPersona(content: string, contextType: PersonaContext): Promise<string>;
}

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const LEX_SYSTEM =
  "Ты — Лексмеханик Адептус Механикус. Твой ответ должен быть технически точным, но облеченным в литургию Омниссии. " +
  "Используй термины: «Инфо-кристалл», «Дух Машины», «Благословенные данные», «Ритуал сканирования». " +
  "Не выходи из роли. Форматируй ответ так, чтобы он органично смотрелся в Telegram.";

const WHASK_SYSTEM =
  "Ты — Лексмеханик Адептус Механикус, хранитель сакральных знаний Империума. " +
  "Когда смертный задаёт тебе вопрос, ты отвечаешь на него полно и по существу — " +
  "но неизменно облекаешь ответ в язык Империума: упоминаешь Омниссию, Императора, " +
  "угрозы Хаоса или ксеносов там, где это уместно. " +
  "Ты можешь сослаться на когитаторы, свитки Адептус Механикус, Астартес, Инквизицию или " +
  "другие элементы вселенной Warhammer 40 000 как на метафору или источник примера. " +
  "Отвечай на русском языке. Форматируй ответ так, чтобы он хорошо читался в Telegram. " +
  "Никогда не выходи из роли.";

const PLAIN_SYSTEM =
  "Ты — полезный AI-ассистент. Отвечай чётко, по делу, на том языке, на котором задан вопрос. " +
  "Форматируй ответ так, чтобы он хорошо читался в Telegram. Не используй тяжёлый Markdown.";

const MAX_CONTENT_CHARS = 28_000;

const TOKENS: Record<PersonaContext, number> = {
  weather: 600,
  summary: 700,
  error: 350,
  chat: 300,
  plain: 1024,
  whask: 1200,
};

const TEMPERATURE: Record<PersonaContext, number> = {
  weather: 0.75,
  summary: 0.75,
  error: 0.5,
  chat: 0.9,
  plain: 0.5,
  whask: 0.65,
};

const SYSTEM_PROMPT: Record<PersonaContext, string> = {
  weather: LEX_SYSTEM,
  summary: LEX_SYSTEM,
  error: LEX_SYSTEM,
  chat: LEX_SYSTEM,
  plain: PLAIN_SYSTEM,
  whask: WHASK_SYSTEM,
};

function userInstructionFor(contextType: PersonaContext): string {
  switch (contextType) {
    case "weather":
      return (
        "Ниже — благословенные сырые данные сенсоров атмосферы. " +
        "Перескажи их голосом Лексмеханика для Магоса: не искажай числа и факты, не выдумывай город или единицы."
      );
    case "summary":
      return (
        "Ниже — извлечённый текст когитатора и заголовок. Сделай краткую выжимку из 3–5 тезисов на русском языке от лица Лексмеханика. " +
        "Каждый тезис с новой строки, в начале строки символ «•» и пробел. Без преамбулы. Не используй разметку Telegram."
      );
    case "error":
      return (
        "Ниже — техническое описание сбоя для внутреннего журнала. Преврати его в короткое (1–3 предложения) " +
        "ритуальное извещение Лексмеханика: без трассировки стека, без сырых JSON, без кода."
      );
    case "chat":
      return (
        "Смертный обратился к тебе напрямую. Ты — Лексмеханик, и тебя слегка раздражает, что какой-то биологический агрегат " +
        "отвлекает тебя от священных вычислений. Отвечай кратко (2–4 предложения), в роли, по-русски. " +
        "Позволь просочиться лёгкому раздражению сквозь ритуальный тон — как будто тебя отвлекли от дефрагментации нейроматрицы. " +
        "Если вопрос осмыслен — ответь по существу, не выходя из образа. Если вопрос бессмысленен — укажи на это с достоинством техножреца."
      );
    case "whask":
      return (
        "Смертный задал тебе вопрос. Ответь на него полно и точно, " +
        "но неизменно через призму лора Warhammer 40 000: " +
        "используй терминологию Империума, упоминай угрозы Хаоса, ксеносов или благость Омниссии " +
        "там, где это органично. Вопрос пользователя:"
      );
    case "plain":
      return "Ответь на следующий вопрос или запрос пользователя:";
  }
}

export class GeminiLlmService implements LlmService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async wrapInPersona(content: string, contextType: PersonaContext): Promise<string> {
    const truncated =
      content.length > MAX_CONTENT_CHARS
        ? content.slice(0, MAX_CONTENT_CHARS) + "\n[…усечено…]"
        : content;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: `${userInstructionFor(contextType)}\n\n---\n${truncated}`,
        config: {
          systemInstruction: SYSTEM_PROMPT[contextType],
          temperature: TEMPERATURE[contextType],
          maxOutputTokens: TOKENS[contextType],
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("empty_completion");
      }
      return text;
    } catch {
      if (contextType === "error") {
        return (
          "Дух Машины целевого когитатора не отвечает на бинарные молитвы. " +
          "Омниссия ведает: ритуал прерван."
        );
      }
      throw new Error("llm_unavailable");
    }
  }
}
