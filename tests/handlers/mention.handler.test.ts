import { describe, it, expect, vi, beforeEach } from "vitest";
import { MentionHandler } from "../../src/handlers/mention.handler";
import { makeFakeCtx, makeMockLlm } from "../helpers/ctx.helper";

describe("MentionHandler", () => {
  let llm: ReturnType<typeof makeMockLlm>;
  let handler: MentionHandler;

  beforeEach(() => {
    llm = makeMockLlm();
    handler = new MentionHandler({ llm });
  });

  it("happy path — strips mention, calls LLM with chat context, replies with result and reply_parameters", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("nurgle info");
    const ctx = makeFakeCtx({ text: "@testbot tell me about Nurgle", messageId: 7 });

    await handler.handle(ctx);

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledOnce();
    expect(llm.wrapInPersona).toHaveBeenCalledWith("tell me about Nurgle", "chat");
    expect(ctx.reply).toHaveBeenCalledWith(
      "nurgle info",
      expect.objectContaining({ reply_parameters: { message_id: 7 }, parse_mode: "HTML" }),
    );
  });

  it("no text — returns early without calling LLM or reply", async () => {
    const ctx = makeFakeCtx();
    (ctx as any).message.text = undefined;

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("no bot username — returns early without calling LLM or reply", async () => {
    const ctx = makeFakeCtx({ text: "@testbot hello" });
    (ctx as any).me = { username: undefined };

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("no mention in text — returns early without calling LLM or reply", async () => {
    const ctx = makeFakeCtx({ text: "just a regular message", botUsername: "testbot" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("only mention (empty stripped) — replies with static message, does NOT call LLM", async () => {
    const ctx = makeFakeCtx({ text: "@testbot", botUsername: "testbot", messageId: 3 });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledOnce();
    const [replyText, replyOptions] = vi.mocked(ctx.reply).mock.calls[0] as [string, unknown];
    expect(replyText).toContain("Соединение установлено");
    expect(replyOptions).toEqual(
      expect.objectContaining({ reply_parameters: { message_id: 3 }, parse_mode: "HTML" }),
    );
  });

  it("case-insensitive mention — @TESTBOT matches botUsername testbot, LLM called with stripped text", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("ok");
    const ctx = makeFakeCtx({ text: "@TESTBOT hello", botUsername: "testbot" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledWith("hello", "chat");
  });

  it("mid-text mention — strips @botname from middle of sentence, LLM receives cleaned text", async () => {
    vi.mocked(llm.wrapInPersona).mockResolvedValue("ok");
    const ctx = makeFakeCtx({ text: "hello @testbot how are you", botUsername: "testbot" });

    await handler.handle(ctx);

    expect(llm.wrapInPersona).toHaveBeenCalledWith("hello how are you", "chat");
  });

  it("LLM throws — retries with error persona, replies with error result, does not rethrow", async () => {
    vi.mocked(llm.wrapInPersona)
      .mockRejectedValueOnce(new Error("quota_exceeded"))
      .mockResolvedValueOnce("error text");

    const ctx = makeFakeCtx({ text: "@testbot tell me something", messageId: 5 });

    await expect(handler.handle(ctx)).resolves.toBeUndefined();

    expect(ctx.replyWithChatAction).toHaveBeenCalledWith("typing");
    expect(llm.wrapInPersona).toHaveBeenCalledTimes(2);
    expect(llm.wrapInPersona).toHaveBeenNthCalledWith(1, "tell me something", "chat");
    expect(llm.wrapInPersona).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("quota_exceeded"),
      "error",
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      "error text",
      expect.objectContaining({ reply_parameters: { message_id: 5 }, parse_mode: "HTML" }),
    );
  });
});
