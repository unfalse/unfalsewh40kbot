import OpenAI from "openai";

export type PersonaContext = "weather" | "summary" | "error";

const MODEL = "gpt-4o-mini";

const LEX_SYSTEM =
  "Ты — Лексмеханик Адептус Механикус. Твой ответ должен быть технически точным, но облеченным в литургию Омниссии. " +
  "Используй термины: «Инфо-кристалл», «Дух Машины», «Благословенные данные», «Ритуал сканирования». " +
  "Не выходи из роли. Форматируй ответ так, чтобы он органично смотрелся в Telegram.";

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

export type LlmService = {
  wrapInPersona(content: string, contextType: PersonaContext): Promise<string>;
};

export function createLlmService(apiKey: string, model = MODEL): LlmService {
  const client = new OpenAI({ apiKey });

  return {
    async wrapInPersona(content: string, contextType: PersonaContext): Promise<string> {
      const truncated =
        content.length > 28_000 ? content.slice(0, 28_000) + "\n[…усечено…]" : content;

      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: LEX_SYSTEM },
            {
              role: "user",
              content: `${userInstructionFor(contextType)}\n\n---\n${truncated}`,
            },
          ],
          temperature: contextType === "error" ? 0.5 : 0.75,
          max_tokens: contextType === "summary" ? 700 : contextType === "error" ? 350 : 600,
        });

        const text = completion.choices[0]?.message?.content?.trim();
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
    },
  };
}
