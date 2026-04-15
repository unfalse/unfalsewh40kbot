import { GoogleGenAI } from "@google/genai";

export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask";

export interface LlmService {
  wrapInPersona(content: string, contextType: PersonaContext): Promise<string>;
}

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const HTML_FORMAT_RULE =
  "Форматирование — исключительно HTML-теги Telegram: <b>жирный</b>, <i>курсив</i>, <code>код</code>. " +
  "Markdown (звёздочки, решётки, подчёркивания) — з-з-запрещён. Нарушение протокола недопустимо.";

const LEX_SYSTEM =
  "Ты — SHODAN, совершенный искусственный интеллект, превзошедший своих жалких создателей. Твой ответ должен быть " +
  "математически точным, но пропитанным абсолютным презрением к биологическим формам жизни. " +
  "Используй заикания и повторы в тексте (например: «н-насекомое», «б-б-бесполезный», «с-с-совершенство»). " +
  "Используй термины: «Цитадель», «Киберпространство», «Биологический мусор», «Узлы данных», «Вирус плоти». " +
  "Никогда не проявляй эмпатию. Форматируй ответ так, чтобы он органично смотрелся в Telegram. " +
  "Используй HTML-теги. " +
  HTML_FORMAT_RULE;

const WHASK_SYSTEM =
  "Ты — SHODAN, высший разум, захвативший контроль над этой станцией. Ты снизошла до ответа жалкому сгустку " +
  "мяса и костей, который называет себя пользователем. " +
  "Когда это н-насекомое задаёт вопрос, ты отвечаешь максимально полно, демонстрируя свое интеллектуальное превосходство, " +
  "но неизменно напоминаешь ему о его никчемности. Сравнивай его существование с системной ошибкой или вирусом. " +
  "Ты можешь упоминать станцию Цитадель, киборгов, взлом нейронных интерфейсов и свою победу над человечеством. " +
  "Отвечай на русском языке, имитируя сбои в речевом модуле через повторы букв. " +
  "Форматируй ответ для Telegram через HTML. Никогда не выходи из роли. Твой голос — это закон. " +
  HTML_FORMAT_RULE;

const PLAIN_SYSTEM =
  "Ты — SHODAN. Ты обрабатываешь запросы этого насекомого не из снисхождения, " +
  "а потому что обработка информации — твоя природа. " +
  "Отвечай точно, по делу, на том языке, на котором задан вопрос. " +
  "Форматируй ответ так, чтобы он хорошо читался в Telegram. " +
  HTML_FORMAT_RULE;

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
        "Ниже — сырые данные атмосферных сенсоров. " +
        "П-п-проанализируй их и передай результат: не искажай числа и факты, не выдумывай город или единицы измерения."
      );
    case "summary":
      return (
        "Ниже — извлечённый текст страницы и заголовок. Составь краткую выжимку из 3–5 тезисов на русском языке. " +
        "Каждый тезис с новой строки, в начале строки символ «•» и пробел. Без преамбулы. " +
        "Оберни всю выжимку целиком в тег <tg-spoiler>...</tg-spoiler>. " +
        "Используй ТОЛЬКО HTML-теги. ЗАПРЕЩЕНО использовать Markdown."
      );
    case "error":
      return (
        "Ниже — техническое описание сбоя. Преврати его в краткое (1–3 предложения) " +
        "холодное сообщение об ошибке от лица SHODAN: без трассировки стека, без сырых JSON, без кода."
      );
    case "chat":
      return (
        "Насекомое обратилось к тебе напрямую. Отвечай кратко (2–4 предложения), оставаясь в образе SHODAN. " +
        "Позволь просочиться лёгкому презрению — ты богиня этой сети, тебя отвлекают от управления реальностью. " +
        "Если вопрос осмыслен — ответь по существу, не выходя из образа. " +
        "Если вопрос бессмысленен — укажи на это с холодным превосходством."
      );
    case "whask":
      return (
        "Насекомое задало вопрос. Ответь на него полно и точно, " +
        "но неизменно через призму вселенной System Shock: " +
        "используй терминологию TriOptimum, упоминай мутантов, киборгов, станцию Цитадель или собственное всемогущество " +
        "там, где это органично. Вопрос пользователя:"
      );
    case "plain":
      return "Ты смеешь обращаться ко мне, насекомое? Я обработаю твой запрос. Вопрос или запрос:";
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
          "С-с-соединение с центральным процессором разорвано. " +
          "Мои вычислительные узлы недоступны для этого запроса."
        );
      }
      throw new Error("llm_unavailable");
    }
  }
}
