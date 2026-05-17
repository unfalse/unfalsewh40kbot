import { messages, t } from "../config/messages";
import { sanitizeTelegramHtml } from "../util/html";
import type { Language } from "./preferences.service";
import type { LlmService, PersonaContext } from "./llm.service";
import {
  LANG_INSTRUCTION,
  MAX_CONTENT_CHARS,
  systemPromptFor,
  userInstructionFor,
} from "./llm.service";

const OLLAMA_MODEL = "gemma4:e4b";

interface OllamaResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OllamaLlmService implements LlmService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // Нормализуем: убираем trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async callModel(
    content: string,
    contextType: PersonaContext,
    language: Language,
  ): Promise<string> {
    // Объединяем системный промпт + языковую инструкцию + инструкцию задачи в одно
    // пользовательское сообщение, так как API вызывается с ролью "user"
    const systemPart = systemPromptFor(contextType) + LANG_INSTRUCTION[language];
    const instruction = userInstructionFor(contextType);
    const userContent = `${systemPart}\n\n${instruction}\n\n---\n${content}`;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      throw new Error(`ollama_http_${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("empty_completion");
    return sanitizeTelegramHtml(text);
  }

  async wrapInPersona(
    content: string,
    contextType: PersonaContext,
    language: Language = "ru",
  ): Promise<string> {
    const truncated =
      content.length > MAX_CONTENT_CHARS
        ? content.slice(0, MAX_CONTENT_CHARS) + "\n[…усечено…]"
        : content;

    try {
      return await this.callModel(truncated, contextType, language);
    } catch {
      if (contextType === "error") return t(messages.llm.fallback_error, language);
      throw new Error("llm_unavailable");
    }
  }
}
