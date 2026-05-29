import { describe, it, expect, beforeEach } from "vitest";
import { ConversationService } from "../../src/services/conversation.service";

describe("ConversationService", () => {
  let svc: ConversationService;

  beforeEach(() => {
    svc = new ConversationService(4); // maxMessages=4 для удобства тестирования
  });

  it("getHistory returns empty array for unknown user", () => {
    expect(svc.getHistory(1)).toEqual([]);
  });

  it("push adds messages and getHistory returns them in order", () => {
    svc.push(1, "user", "hello");
    svc.push(1, "assistant", "hi there");

    expect(svc.getHistory(1)).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ]);
  });

  it("trims oldest messages when maxMessages is exceeded", () => {
    svc.push(1, "user", "msg1");
    svc.push(1, "assistant", "msg2");
    svc.push(1, "user", "msg3");
    svc.push(1, "assistant", "msg4");
    svc.push(1, "user", "msg5"); // 5th — should evict msg1

    const history = svc.getHistory(1);
    expect(history).toHaveLength(4);
    expect(history[0].content).toBe("msg2");
    expect(history[3].content).toBe("msg5");
  });

  it("clear removes history for the user", () => {
    svc.push(1, "user", "hello");
    svc.clear(1);
    expect(svc.getHistory(1)).toEqual([]);
  });

  it("clear does not affect other users", () => {
    svc.push(1, "user", "user1 message");
    svc.push(2, "user", "user2 message");
    svc.clear(1);
    expect(svc.getHistory(2)).toHaveLength(1);
  });

  it("getHistory returns a copy — mutations do not affect stored history", () => {
    svc.push(1, "user", "hello");
    const history = svc.getHistory(1);
    history.push({ role: "user", content: "injected" });
    expect(svc.getHistory(1)).toHaveLength(1);
  });

  it("histories are isolated per userId", () => {
    svc.push(1, "user", "user1");
    svc.push(2, "user", "user2");
    expect(svc.getHistory(1)).toEqual([{ role: "user", content: "user1" }]);
    expect(svc.getHistory(2)).toEqual([{ role: "user", content: "user2" }]);
  });
});
