import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhaskCommandHandler } from "../../src/handlers/whask.handler";
import { makeFakeCtx, makeMockLlm } from "../helpers/ctx.helper";

describe("WhaskCommandHandler", () => {
  let llm: ReturnType<typeof makeMockLlm>;
  let handler: WhaskCommandHandler;

  beforeEach(() => {
    llm = makeMockLlm();
    handler = new WhaskCommandHandler({ llm });
  });

  it("happy path — calls LLM with trimmed query and replies with result", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("SHODAN response");
    const ctx = makeFakeCtx({ text: "/whask scan the area" });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith("scan the area", "whask");
    expect(ctx.reply).toHaveBeenCalledWith(
      "SHODAN response",
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("empty query — does NOT call LLM and sends static hint", async () => {
    const ctx = makeFakeCtx({ text: "/whask" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.replyWithChatAction).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg.length).toBeGreaterThan(0);
  });

  it("@botname stripped — LLM receives query without bot mention", async () => {
    const ctx = makeFakeCtx({ text: "/whask@testbot system status" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledWith("system status", "whask");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ parse_mode: "HTML" }),
    );
  });

  it("LLM throws — replies with non-empty fallback and does not rethrow", async () => {
    vi.mocked(llm.wrapInPersona).mockRejectedValue(new Error("quota_exceeded"));
    const ctx = makeFakeCtx({ text: "/whask something" });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(ctx.reply).toHaveBeenCalledOnce();
    const replyArg = vi.mocked(ctx.reply).mock.calls[0][0] as string;
    expect(replyArg.length).toBeGreaterThan(0);
  });

  it("reply_parameters forwarded — reply includes message_id when messageId is set", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("SHODAN response");
    const ctx = makeFakeCtx({ text: "/whask scan the area", messageId: 42 });

    await handler.handle(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      "SHODAN response",
      expect.objectContaining({ reply_parameters: { message_id: 42 } }),
    );
  });

  it("no reply_parameters when messageId is 0", async () => {
    const ctx = makeFakeCtx({ text: "/whask scan the area", messageId: 0 });
    llm.wrapInPersona = vi.fn().mockResolvedValue("answer");
    await handler.handle(ctx);
    const [, options] = vi.mocked(ctx.reply).mock.calls[0] as [string, Record<string, unknown>];
    expect(options).not.toHaveProperty("reply_parameters");
    expect(options).toMatchObject({ parse_mode: "HTML" });
  });
});
