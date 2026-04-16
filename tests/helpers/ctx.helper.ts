import { vi } from "vitest";
import type { Context } from "grammy";
import type { LlmService, PersonaContext } from "../../src/services/llm.service";
import type { WeatherService, CurrentWeatherFacts } from "../../src/services/weather.service";
import type { ParserService, ParsedPage } from "../../src/services/parser.service";

type MessageOverrides = {
  text?: string;
  messageId?: number;
  botUsername?: string;
  entities?: Array<{ type: string; offset: number; length: number; url?: string }>;
  chatId?: number;
};

export function makeFakeCtx(overrides: MessageOverrides = {}): Context {
  const ctx = {
    message: {
      message_id: overrides.messageId ?? 1,
      text: overrides.text ?? "",
      entities: overrides.entities,
      chat: { id: overrides.chatId ?? 100, type: "private" as const },
      from: { id: 1, first_name: "Test", username: "testuser" },
    },
    me: { username: overrides.botUsername ?? "testbot" },
    reply: vi.fn().mockResolvedValue(undefined),
    replyWithHTML: vi.fn().mockResolvedValue(undefined), // no current handler uses replyWithHTML; mocked for future handlers
    replyWithChatAction: vi.fn().mockResolvedValue(undefined),
  } as unknown as Context;
  return ctx;
}

export function makeMockLlm(): LlmService {
  return {
    wrapInPersona: vi.fn<(content: string, contextType: PersonaContext) => Promise<string>>().mockResolvedValue("mocked LLM response"),
  };
}

export function makeMockWeather(
  factOverrides: Partial<CurrentWeatherFacts> = {}
): WeatherService {
  const facts: CurrentWeatherFacts = {
    cityName: "TestCity",
    country: "TC",
    tempC: 20,
    feelsLikeC: 19,
    description: "clear sky",
    humidityPct: 50,
    pressureHpa: 1013,
    windMs: 5,
    ...factOverrides,
  };
  return {
    getCurrentByCity: vi.fn<(city: string) => Promise<CurrentWeatherFacts>>().mockResolvedValue(facts),
    formatFactsForLlm: vi.fn<(facts: CurrentWeatherFacts) => string>().mockReturnValue("TestCity: 20°C, clear sky"),
  };
}

export function makeMockParser(): ParserService {
  return {
    parseUrl: vi.fn<(url: string) => Promise<ParsedPage>>().mockResolvedValue({
      title: "Test Page",
      text: "Test content",
    }),
  };
}
