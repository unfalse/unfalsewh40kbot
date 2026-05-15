import { GoogleGenAI } from "@google/genai";
import { messages } from "../config/messages";
import { sanitizeTelegramHtml } from "../util/html";

export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask";

export interface LlmService {
  wrapInPersona(content: string, contextType: PersonaContext): Promise<string>;
}

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

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
          systemInstruction: systemPromptFor(contextType),
          temperature: TEMPERATURE[contextType],
          maxOutputTokens: TOKENS[contextType],
        },
      });

      const raw = response.text?.trim();
      if (!raw) {
        throw new Error("empty_completion");
      }
      return sanitizeTelegramHtml(raw);
    } catch {
      if (contextType === "error") {
        return messages.llm.fallback_error;
      }
      throw new Error("llm_unavailable");
    }
  }
}
