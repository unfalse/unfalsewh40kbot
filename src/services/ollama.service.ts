import { messages, t } from "../config/messages";
import { sanitizeTelegramHtml } from "../util/html";
import { Semaphore } from "../util/semaphore";
import type { Language } from "./preferences.service";
import type { LlmService, PersonaContext } from "./llm.service";
import {
  LANG_INSTRUCTION,
  LENGTH_INSTRUCTION,
  MAX_CONTENT_CHARS,
  systemPromptFor,
  userInstructionFor,
} from "./llm.service";

const ollamaSemaphore = new Semaphore(
  parseInt(process.env["LLM_CONCURRENCY"] ?? "", 10) || 1,
);

interface OllamaResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OllamaLlmService implements LlmService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  private async callModel(
    content: string,
    contextType: PersonaContext,
    language: Language,
  ): Promise<string> {
    const systemPart = systemPromptFor(contextType) + LANG_INSTRUCTION[language] + LENGTH_INSTRUCTION;
    const instruction = userInstructionFor(contextType);
    const userContent = `${systemPart}\n\n${instruction}\n\n---\n${content}`;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: userContent }],
        // max_tokens не передаём: для thinking-моделей (gemma4) жёсткий лимит
        // съедает весь бюджет на «думалку» и оставляет пустой content.
        // Длину ответа контролирует системный промпт («один абзац»).
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
      return await ollamaSemaphore.run(() => this.callModel(truncated, contextType, language));
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      console.error(`[OllamaLlmService] error (${contextType}):`, reason);
      if (contextType === "error") return t(messages.llm.fallback_error, language);
      throw new Error("llm_unavailable");
    }
  }
}
