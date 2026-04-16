import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeatherCommandHandler } from "../../src/handlers/weather.handler";
import { makeFakeCtx, makeMockLlm, makeMockWeather } from "../helpers/ctx.helper";

describe("WeatherCommandHandler", () => {
  let weather: ReturnType<typeof makeMockWeather>;
  let llm: ReturnType<typeof makeMockLlm>;
  let handler: WeatherCommandHandler;

  beforeEach(() => {
    weather = makeMockWeather();
    llm = makeMockLlm();
    handler = new WeatherCommandHandler({ weather, llm });
  });

  it("happy path — fetches weather, formats facts, calls LLM with weather context, replies with result", async () => {
    vi.mocked(weather.formatFactsForLlm).mockReturnValue("facts text");
    vi.mocked(llm.wrapInPersona).mockResolvedValue("weather report");
    const ctx = makeFakeCtx({ text: "/weather Moscow" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(weather.getCurrentByCity).toHaveBeenCalledWith("Moscow");
    expect(weather.formatFactsForLlm).toHaveBeenCalledOnce();
    const facts = await vi.mocked(weather.getCurrentByCity).mock.results[0].value;
    expect(weather.formatFactsForLlm).toHaveBeenCalledWith(facts);
    expect(llm.wrapInPersona).toHaveBeenCalledWith("facts text", "weather");
    expect(ctx.reply).toHaveBeenCalledWith(
      "weather report",
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("empty city — does NOT call getCurrentByCity, sends error reply", async () => {
    const ctx = makeFakeCtx({ text: "/weather" });

    await handler.handle(ctx);

    expect(weather.getCurrentByCity).not.toHaveBeenCalled();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "error");
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("city_not_found error — replies with error message, does not rethrow", async () => {
    vi.mocked(weather.getCurrentByCity).mockRejectedValue(new Error("city_not_found"));
    const ctx = makeFakeCtx({ text: "/weather Atlantis" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("не найден"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("timeout error — replies with error message, does not rethrow", async () => {
    vi.mocked(weather.getCurrentByCity).mockRejectedValue(new Error("timeout"));
    const ctx = makeFakeCtx({ text: "/weather Tokyo" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("аймаут"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("unknown OWM error — replies with error message containing raw error code, does not rethrow", async () => {
    vi.mocked(weather.getCurrentByCity).mockRejectedValue(new Error("owm_401"));
    const ctx = makeFakeCtx({ text: "/weather Berlin" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("owm_401"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("formatFactsForLlm output threading — whatever formatFactsForLlm returns is passed to wrapInPersona", async () => {
    const customFormatted = "custom formatted weather data XYZ";
    vi.mocked(weather.formatFactsForLlm).mockReturnValue(customFormatted);
    const ctx = makeFakeCtx({ text: "/weather Paris" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledWith(customFormatted, "weather");
  });
});
