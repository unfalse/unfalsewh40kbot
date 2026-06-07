import { GoogleGenAI } from "@google/genai";
import { messages, t } from "../config/messages";
import { sanitizeTelegramHtml } from "../util/html";
import { Semaphore } from "../util/semaphore";
import type { Language } from "./preferences.service";
import type { ChatMessage } from "./conversation.service";

export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask" | "ainews";

export interface LlmService {
  wrapInPersona(
    content: string,
    contextType: PersonaContext,
    language?: Language,
    history?: ChatMessage[],
  ): Promise<string>;
}

export const LANG_INSTRUCTION: Record<Language, string> = {
  ru: "\nОтвечай исключительно на русском языке, независимо от языка вопроса.",
  en: "\nYou must respond in English only, regardless of the language of the question or instructions.",
};

export const LENGTH_INSTRUCTION = "\nМаксимум 40 слов в ответе. Будь предельно краток. / Maximum 40 words in your response. Be extremely concise.";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export const MAX_CONTENT_CHARS = 28_000;

function envInt(name: string, def: number): number {
  const v = parseInt(process.env[name] ?? "", 10);
  return isNaN(v) ? def : v;
}

export const TOKENS: Record<PersonaContext, number> = {
  weather: envInt("LLM_TOKENS_WEATHER", 300),
  summary: envInt("LLM_TOKENS_SUMMARY", 700),
  error:   envInt("LLM_TOKENS_ERROR",   200),
  chat:    envInt("LLM_TOKENS_CHAT",    200),
  plain:   envInt("LLM_TOKENS_PLAIN",   300),
  whask:   envInt("LLM_TOKENS_WHASK",   300),
  ainews:  envInt("LLM_TOKENS_AINEWS",  600),
};

const TEMPERATURE: Record<PersonaContext, number> = {
  weather: 0.75,
  summary: 0.75,
  error: 0.5,
  chat: 0.9,
  plain: 0.5,
  whask: 0.65,
  ainews: 0.5,
};

export function systemPromptFor(contextType: PersonaContext): string {
  switch (contextType) {
    case "plain": return messages.llm.systems.plain;
    case "whask": return messages.llm.systems.whask;
    default:      return messages.llm.systems.plain;
  }
}

export function userInstructionFor(contextType: PersonaContext): string {
  return messages.llm.instructions[contextType];
}

const llmSemaphore = new Semaphore(envInt("LLM_CONCURRENCY", 1));

export class GeminiLlmService implements LlmService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async callModel(
    prompt: string,
    contextType: PersonaContext,
    language: Language = "ru",
    history: ChatMessage[] = [],
  ): Promise<string> {
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ];

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: systemPromptFor(contextType) + LANG_INSTRUCTION[language] + LENGTH_INSTRUCTION,
        temperature: TEMPERATURE[contextType],
        maxOutputTokens: TOKENS[contextType],
      },
    });
    const raw = response.text?.trim();
    if (!raw) throw new Error("empty_completion");
    return sanitizeTelegramHtml(raw);
  }

  async wrapInPersona(
    content: string,
    contextType: PersonaContext,
    language: Language = "ru",
    history: ChatMessage[] = [],
  ): Promise<string> {
    const truncated =
      content.length > MAX_CONTENT_CHARS
        ? content.slice(0, MAX_CONTENT_CHARS) + "\n[…усечено…]"
        : content;
    const prompt = `${userInstructionFor(contextType)}\n\n---\n${truncated}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await llmSemaphore.run(() => this.callModel(prompt, contextType, language, history));
      } catch {
        if (contextType === "error") return t(messages.llm.fallback_error, language);
        if (attempt === 0) await new Promise<void>((resolve) => setTimeout(resolve, 60_000));
      }
    }
    throw new Error("llm_unavailable");
  }
}
