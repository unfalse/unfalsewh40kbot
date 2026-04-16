import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryTextHandler } from "../../src/handlers/summary.handler";
import { makeFakeCtx, makeMockLlm, makeMockParser } from "../helpers/ctx.helper";

describe("SummaryTextHandler", () => {
  let llm: ReturnType<typeof makeMockLlm>;
  let parser: ReturnType<typeof makeMockParser>;
  let handler: SummaryTextHandler;

  beforeEach(() => {
    llm = makeMockLlm();
    parser = makeMockParser();
    handler = new SummaryTextHandler({ parser, llm });
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it("happy path (regex URL) — parses URL from plain text and replies with summary", async () => {
    vi.mocked(parser.parseUrl).mockResolvedValue({ title: "Example", text: "page content" });
    vi.mocked(llm.wrapInPersona).mockResolvedValue("summary text");
    const ctx = makeFakeCtx({ text: "check out https://example.com for info" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(parser.parseUrl).toHaveBeenCalledWith("https://example.com");
    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("page content"),
      "summary",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg).toContain("summary text");
  });

  it("happy path (entity URL) — extracts URL from message entity and calls parser", async () => {
    // "check out https://example.com" → offset 10, length 19
    const text = "check out https://example.com";
    const ctx = makeFakeCtx({
      text,
      entities: [{ type: "url", offset: 10, length: 19 }],
    });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(parser.parseUrl).toHaveBeenCalledWith("https://example.com");
    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "summary");
  });

  it("happy path (text_link entity) — uses entity.url and calls parser with it", async () => {
    const ctx = makeFakeCtx({
      text: "click here for more info",
      entities: [{ type: "text_link", offset: 0, length: 10, url: "https://example.com" }],
    });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(parser.parseUrl).toHaveBeenCalledWith("https://example.com");
    expect(ctx.reply).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "summary");
  });

  // ── Early return guards ────────────────────────────────────────────────────

  it("empty text string — early return, LLM never called", async () => {
    const ctx = makeFakeCtx({ text: undefined });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("command message — text starting with '/' early returns without calling LLM", async () => {
    const ctx = makeFakeCtx({ text: "/start" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("bot mention early return — text containing @botusername early returns", async () => {
    const ctx = makeFakeCtx({
      text: "hey @testbot what do you think of https://example.com",
      botUsername: "testbot",
    });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("no URL in text — early return, no LLM or parser calls", async () => {
    const ctx = makeFakeCtx({ text: "hello world, nothing special here" });

    await handler.handle(ctx);

    expect(parser.parseUrl).not.toHaveBeenCalled();
    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  // ── SSRF / blocked URL ─────────────────────────────────────────────────────

  it("SSRF blocked URL (localhost) — replies with error message, parser NOT called", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("blocked error response");
    const ctx = makeFakeCtx({ text: "see http://localhost/secret" });

    await handler.handle(ctx);

    expect(parser.parseUrl).not.toHaveBeenCalled();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "error");
    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg).toBe("blocked error response");
  });

  it("IMDS/AWS metadata endpoint is SSRF blocked", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("blocked error response");
    const ctx = makeFakeCtx({ text: "check http://169.254.169.254/latest/meta-data" });
    await handler.handle(ctx);
    expect(parser.parseUrl).not.toHaveBeenCalled();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "error");
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("private IP blocked — replies with error message, parser NOT called", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("private ip error");
    const ctx = makeFakeCtx({ text: "see http://192.168.1.1/secret" });

    await handler.handle(ctx);

    expect(parser.parseUrl).not.toHaveBeenCalled();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(expect.any(String), "error");
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("parser throws — reply still sent via error persona, no rethrow", async () => {
    vi.mocked(parser.parseUrl).mockRejectedValue(new Error("parse_failed"));
    vi.mocked(llm.wrapInPersona).mockResolvedValue("error persona response");
    const ctx = makeFakeCtx({ text: "check https://example.com please" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("parse_failed"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg).toBe("error persona response");
  });

  // ── HTML escaping ──────────────────────────────────────────────────────────

  it("HTML special chars in title escaped — raw tags not present in title portion of reply", async () => {
    vi.mocked(parser.parseUrl).mockResolvedValue({
      title: "A <b>B</b> & C",
      text: "content",
    });
    vi.mocked(llm.wrapInPersona).mockResolvedValue("bullets");
    const ctx = makeFakeCtx({ text: "visit https://example.com" });

    await handler.handle(ctx);

    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    // The title should appear HTML-escaped inside the <b> wrapper
    expect(replyArg).toContain("&lt;b&gt;");
    expect(replyArg).toContain("&amp;");
    // Raw unescaped inner tag must not appear in the title segment
    expect(replyArg).not.toContain("<b>B</b>");
    // LLM output must be present in the reply
    expect(replyArg).toContain("bullets");
  });
});
