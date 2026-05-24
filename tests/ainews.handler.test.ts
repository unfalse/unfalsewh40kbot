import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Context } from "grammy";
import { AiNewsCommandHandler } from "../src/handlers/ainews.handler";
import type { HnStory } from "../src/services/parser.service";
import { makeFakeCtx, makeMockPrefs } from "./helpers/ctx.helper";

describe("AiNewsCommandHandler", () => {
  let handler: AiNewsCommandHandler;
  let mockParser: any;
  let mockLlm: any;
  let mockPrefs: any;

  beforeEach(() => {
    mockParser = {
      fetchHnAiNews: vi.fn<() => Promise<HnStory[]>>(),
    };
    mockLlm = {
      wrapInPersona: vi.fn<[string, string, string]>(),
    };
    mockPrefs = makeMockPrefs("ru");

    handler = new AiNewsCommandHandler({
      parser: mockParser,
      llm: mockLlm,
      prefs: mockPrefs,
    });
  });

  it("should handle /ainews with no results", async () => {
    mockParser.fetchHnAiNews.mockResolvedValue([]);

    const ctx = makeFakeCtx();
    await handler.handle(ctx as Context);

    expect(ctx.reply).toHaveBeenCalled();
    const calls = (ctx.reply as any).mock.calls;
    expect(calls[0][0]).toContain("Сведений");
  });

  it("should fetch news and generate summary", async () => {
    const stories: HnStory[] = [
      {
        title: "OpenAI releases GPT-5",
        url: "https://example.com/1",
        score: 500,
      },
      {
        title: "Claude wins AI benchmark",
        url: "https://example.com/2",
        score: 450,
      },
    ];
    mockParser.fetchHnAiNews.mockResolvedValue(stories);
    mockLlm.wrapInPersona.mockResolvedValue("Summary text");

    const ctx = makeFakeCtx();
    await handler.handle(ctx as Context);

    expect(mockLlm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("OpenAI"),
      "ainews",
      "ru",
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Summary text"),
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("should handle LLM errors", async () => {
    mockParser.fetchHnAiNews.mockResolvedValue([
      {
        title: "AI News",
        url: "https://example.com/1",
        score: 100,
      },
    ]);
    mockLlm.wrapInPersona.mockRejectedValueOnce(new Error("test error"));

    const ctx = makeFakeCtx();
    await handler.handle(ctx as Context);

    expect(mockLlm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("Сбой"),
      "error",
      "ru",
    );
  });
});
