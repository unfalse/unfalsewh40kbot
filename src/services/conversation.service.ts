export type ChatMessage = { role: "user" | "assistant"; content: string };

export class ConversationService {
  private readonly sessions = new Map<number, ChatMessage[]>();
  private readonly maxMessages: number;

  constructor(maxMessages = parseInt(process.env["CONVERSATION_MAX_MESSAGES"] ?? "20", 10)) {
    this.maxMessages = isNaN(maxMessages) || maxMessages < 2 ? 20 : maxMessages;
  }

  getHistory(userId: number): ChatMessage[] {
    return [...(this.sessions.get(userId) ?? [])];
  }

  push(userId: number, role: "user" | "assistant", content: string): void {
    const history = this.sessions.get(userId) ?? [];
    history.push({ role, content });
    if (history.length > this.maxMessages) {
      history.splice(0, history.length - this.maxMessages);
    }
    this.sessions.set(userId, history);
  }

  clear(userId: number): void {
    this.sessions.delete(userId);
  }
}
