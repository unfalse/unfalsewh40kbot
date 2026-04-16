import { describe, it, expect, vi, beforeEach } from "vitest";
import { AskCommandHandler } from "../../src/handlers/ask.handler";
import { makeFakeCtx, makeMockLlm } from "../helpers/ctx.helper";

describe("AskCommandHandler", () => {
  let llm: ReturnType<typeof makeMockLlm>;
  let handler: AskCommandHandler;

  beforeEach(() => {
    llm = makeMockLlm();
    handler = new AskCommandHandler({ llm });
  });

  it("happy path — calls LLM with trimmed query and replies with result", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("LLM answer");
    const ctx = makeFakeCtx({ text: "/ask tell me about Warhammer" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith("tell me about Warhammer", "plain");
    expect(ctx.reply).toHaveBeenCalledWith(
      "LLM answer",
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("empty query — does NOT call LLM and sends usage hint", async () => {
    const ctx = makeFakeCtx({ text: "/ask" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.replyWithChatAction).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg.length).toBeGreaterThan(0);
  });

  it("@botname stripped — LLM receives query without the bot mention", async () => {
    const ctx = makeFakeCtx({ text: "/ask@testbot what is chaos" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledWith("what is chaos", "plain");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("LLM throws — replies with non-empty fallback and does not rethrow", async () => {
    vi.mocked(llm.wrapInPersona).mockRejectedValue(new Error("quota_exceeded"));
    const ctx = makeFakeCtx({ text: "/ask something" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg.length).toBeGreaterThan(0);
  });

  it("reply_parameters forwarded — reply includes message_id when messageId is set", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("LLM answer");
    const ctx = makeFakeCtx({ text: "/ask test query", messageId: 42 });

    await handler.handle(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      "LLM answer",
      expect.objectContaining({ reply_parameters: { message_id: 42 } }),
    );
  });

  it("falsy messageId — reply has parse_mode but no reply_parameters", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("LLM answer");
    const ctx = makeFakeCtx({ text: "/ask hello", messageId: 0 });

    await handler.handle(ctx);

    expect(ctx.reply).toHaveBeenCalledWith("LLM answer", { parse_mode: "HTML" });
  });
});
