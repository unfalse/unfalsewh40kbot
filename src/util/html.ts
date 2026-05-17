const BLOCK_TAGS = /\s*<\/?(p|div|section|article|header|footer|h[1-6]|ul|ol|li)(\s[^>]*)?\/?>\s*/gi;
const BR_TAGS = /\s*<br\s*\/?>\s*/gi;
const INLINE_STRIP = /<\/?(span|font|figure|img|table|thead|tbody|tr|td|th|caption|mark|small|sub|sup|abbr|cite|q|var|kbd|samp|ruby|rt|rp)(\s[^>]*)?\/?>/gi;

// Markdown code fences: ```lang\n...\n``` — Gemini ignores the "no Markdown" rule sometimes
const MARKDOWN_FENCE = /```[\w-]*\r?\n?([\s\S]*?)\r?\n?```/g;

// <pre> with any attribute is non-standard Telegram HTML (e.g. <pre language="html">)
// and means Gemini wrapped its formatted output in a code block.
// Plain <pre> and <pre><code class="language-..."> are kept.
const PRE_WITH_ATTRS = /<pre\s[^>]*>([\s\S]*?)<\/pre>/gi;

const TELEGRAM_TAGS = new Set([
  "b", "strong", "i", "em", "u", "ins", "s", "strike", "del",
  "code", "pre", "a", "tg-spoiler", "tg-emoji", "blockquote",
]);

// Fixes mismatched/unclosed tags that would cause Telegram 400 errors.
// Mismatched closing tags are dropped; unclosed tags are auto-closed at end.
function balanceTags(text: string): string {
  const stack: string[] = [];
  const result = text.replace(/<(\/?)([a-z][\w-]*)([^>]*?)>/gi, (match, slash, tag) => {
    const t = tag.toLowerCase();
    if (!TELEGRAM_TAGS.has(t)) return ""; // strip any tag not supported by Telegram
    if (!slash) {
      stack.push(t);
      return match;
    }
    if (stack.length && stack[stack.length - 1] === t) {
      stack.pop();
      return match;
    }
    return ""; // mismatched closing tag — drop it
  });
  return result + stack.reverse().map((t) => `</${t}>`).join("");
}

/**
 * Strips HTML tags and constructs unsupported by Telegram Bot API.
 * Block-level tags → newlines. Inline wrappers → removed.
 * Markdown code fences and <pre lang="..."> wrappers → unwrapped.
 * Telegram supports: b, strong, i, em, u, ins, s, strike, del,
 *                    code, pre, a, tg-spoiler, tg-emoji, blockquote.
 */
export function sanitizeTelegramHtml(text: string): string {
  const cleaned = text
    .replace(MARKDOWN_FENCE, "$1")
    .replace(PRE_WITH_ATTRS, "$1")
    .replace(BLOCK_TAGS, "\n")
    .replace(BR_TAGS, "\n")
    .replace(INLINE_STRIP, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return balanceTags(cleaned);
}
