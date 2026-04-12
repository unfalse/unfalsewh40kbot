import { GoogleGenAI } from "@google/genai";

export type PersonaContext = "weather" | "summary" | "error";

export interface LlmService {
  wrapInPersona(content: string, contextType: PersonaContext): Promise<string>;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

const LEX_SYSTEM =
  "Ты — Лексмеханик Адептус Механикус. Твой ответ должен быть технически точным, но облеченным в литургию Омниссии. " +
  "Используй термины: «Инфо-кристалл», «Дух Машины», «Благословенные данные», «Ритуал сканирования». " +
  "Не выходи из роли. Форматируй ответ так, чтобы он органично смотрелся в Telegram.";

const MAX_CONTENT_CHARS = 28_000;

const TOKENS: Record<PersonaContext, number> = {
  weather: 600,
  summary: 700,
  error: 350,
};

const TEMPERATURE: Record<PersonaContext, number> = {
  weather: 0.75,
  summary: 0.75,
  error: 0.5,
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
          systemInstruction: LEX_SYSTEM,
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
