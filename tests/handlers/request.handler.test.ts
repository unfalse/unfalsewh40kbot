import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequestCommandHandler } from "../../src/handlers/request.handler";
import { makeFakeCtx, makeMockLlm } from "../helpers/ctx.helper";

describe("RequestCommandHandler", () => {
  let llm: ReturnType<typeof makeMockLlm>;
  let handler: RequestCommandHandler;

  beforeEach(() => {
    llm = makeMockLlm();
    handler = new RequestCommandHandler({ llm });
  });

  it("happy path — calls LLM with trimmed query and replies with result", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("answer");
    const ctx = makeFakeCtx({ text: "/request what is chaos" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith("what is chaos", "chat");
    expect(ctx.reply).toHaveBeenCalledWith(
      "answer",
      expect.objectContaining({ parse_mode: "HTML", reply_parameters: { message_id: 1 } }),
    );
  });

  it("empty query — calls LLM with error context and replies with result", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("error reply");
    const ctx = makeFakeCtx({ text: "/request" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("без текста"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      "error reply",
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("@botname stripped — LLM receives query without the bot mention", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("answer");
    const ctx = makeFakeCtx({ text: "/request@testbot how does this work" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledWith("how does this work", "chat");
  });

  it("LLM primary throws, error-persona retry succeeds — reply called with fallback text", async () => {
    vi.mocked(llm.wrapInPersona)
      .mockRejectedValueOnce(new Error("quota_exceeded"))
      .mockResolvedValueOnce("fallback text");
    const ctx = makeFakeCtx({ text: "/request what is chaos" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledTimes(2);
    expect(llm.wrapInPersona).toHaveBeenNthCalledWith(1, "what is chaos", "chat");
    expect(llm.wrapInPersona).toHaveBeenNthCalledWith(2, expect.stringContaining("quota_exceeded"), "error");
    expect(ctx.reply).toHaveBeenCalledWith(
      "fallback text",
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("whitespace-only query — behaves same as empty query, calls LLM with error context", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("error reply");
    const ctx = makeFakeCtx({ text: "/request   " });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith(
      expect.stringContaining("без текста"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  it("both LLM calls throw — handler rejects with error from fallback call", async () => {
    vi.mocked(llm.wrapInPersona)
      .mockRejectedValueOnce(new Error("primary_error"))
      .mockRejectedValueOnce(new Error("fallback_error"));
    const ctx = makeFakeCtx({ text: "/request what is chaos" });

    await expect(handler.handle(ctx)).rejects.toThrow("fallback_error");
  });
});
