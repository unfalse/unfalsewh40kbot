import { GoogleGenAI } from "@google/genai";
import { messages, t } from "../config/messages";
import { sanitizeTelegramHtml } from "../util/html";
import type { Language } from "./preferences.service";

export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask";

export interface LlmService {
  wrapInPersona(content: string, contextType: PersonaContext, language?: Language): Promise<string>;
}

const LANG_INSTRUCTION: Record<Language, string> = {
  ru: "\nОтвечай исключительно на русском языке, независимо от языка вопроса.",
  en: "\nYou must respond in English only, regardless of the language of the question or instructions.",
};

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const MAX_CONTENT_CHARS = 28_000;

const TOKENS: Record<PersonaContext, number> = {
  weather: 300,
  summary: 700,
  error: 200,
  chat: 200,
  plain: 300,
  whask: 300,
};

const TEMPERATURE: Record<PersonaContext, number> = {
  weather: 0.75,
  summary: 0.75,
  error: 0.5,
  chat: 0.9,
  plain: 0.5,
  whask: 0.65,
};

function systemPromptFor(contextType: PersonaContext): string {
  switch (contextType) {
    case "plain": return messages.llm.systems.plain;
    case "whask": return messages.llm.systems.whask;
    default:      return messages.llm.systems.lex;
  }
}

function userInstructionFor(contextType: PersonaContext): string {
  return messages.llm.instructions[contextType];
}

export class GeminiLlmService implements LlmService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  private async callModel(prompt: string, contextType: PersonaContext, language: Language = "ru"): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: systemPromptFor(contextType) + LANG_INSTRUCTION[language],
        temperature: TEMPERATURE[contextType],
        maxOutputTokens: TOKENS[contextType],
      },
    });
    const raw = response.text?.trim();
    if (!raw) throw new Error("empty_completion");
    return sanitizeTelegramHtml(raw);
  }

  async wrapInPersona(content: string, contextType: PersonaContext, language: Language = "ru"): Promise<string> {
    const truncated =
      content.length > MAX_CONTENT_CHARS
        ? content.slice(0, MAX_CONTENT_CHARS) + "\n[…усечено…]"
        : content;
    const prompt = `${userInstructionFor(contextType)}\n\n---\n${truncated}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.callModel(prompt, contextType, language);
      } catch {
        if (contextType === "error") return t(messages.llm.fallback_error, language);
        if (attempt === 0) await new Promise<void>((resolve) => setTimeout(resolve, 60_000));
      }
    }
    throw new Error("llm_unavailable");
  }
}
