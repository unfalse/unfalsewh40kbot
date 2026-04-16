import { describe, it, expect } from "vitest";
import { MarkdownV2 } from "../../src/util/markdownv2";

describe("MarkdownV2.escape", () => {
  it("returns input unchanged when there are no special characters", () => {
    expect(MarkdownV2.escape("Hello World 123")).toBe("Hello World 123");
  });

  it("returns empty string unchanged", () => {
    expect(MarkdownV2.escape("")).toBe("");
  });

  it("doubles a backslash", () => {
    expect(MarkdownV2.escape("\\")).toBe("\\\\");
  });

  it("escapes backslash before processing other special characters", () => {
    // A backslash followed by an underscore: the backslash is doubled first,
    // then the underscore is escaped → "\\\_"
    expect(MarkdownV2.escape("\\_")).toBe("\\\\\\_");
  });

  it.each([
    ["_", "\\_"],
    ["*", "\\*"],
    ["[", "\\["],
    ["]", "\\]"],
    ["(", "\\("],
    [")", "\\)"],
    ["~", "\\~"],
    ["`", "\\`"],
    [">", "\\>"],
    ["#", "\\#"],
    ["+", "\\+"],
    ["-", "\\-"],
    ["=", "\\="],
    ["|", "\\|"],
    ["{", "\\{"],
    ["}", "\\}"],
    [".", "\\."],
    ["!", "\\!"],
  ])('escapes special character "%s"', (input, expected) => {
    expect(MarkdownV2.escape(input)).toBe(expected);
  });

  it("escapes all special characters in a mixed string", () => {
    const input = "Hello_World*test";
    const result = MarkdownV2.escape(input);
    expect(result).toBe("Hello\\_World\\*test");
  });

  it("escapes a complex Telegram-like formatting string", () => {
    const input = "_bold_ *italic* [link](url) ~strike~ `code` #tag !alert";
    const result = MarkdownV2.escape(input);
    expect(result).toBe(
      "\\_bold\\_ \\*italic\\* \\[link\\]\\(url\\) \\~strike\\~ \\`code\\` \\#tag \\!alert",
    );
  });
});
