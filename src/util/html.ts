const BLOCK_TAGS = /\s*<\/?(p|div|section|article|header|footer|h[1-6]|ul|ol|li)(\s[^>]*)?\/?>\s*/gi;
const BR_TAGS = /\s*<br\s*\/?>\s*/gi;
const INLINE_STRIP = /<\/?(span|figure|img|table|thead|tbody|tr|td|th|caption)(\s[^>]*)?\/?>/gi;

// Markdown code fences: ```lang\n...\n``` — Gemini ignores the "no Markdown" rule sometimes
const MARKDOWN_FENCE = /```[\w-]*\r?\n?([\s\S]*?)\r?\n?```/g;

// <pre> with any attribute is non-standard Telegram HTML (e.g. <pre language="html">)
// and means Gemini wrapped its formatted output in a code block.
// Plain <pre> and <pre><code class="language-..."> are kept.
const PRE_WITH_ATTRS = /<pre\s[^>]*>([\s\S]*?)<\/pre>/gi;

/**
 * Strips HTML tags and constructs unsupported by Telegram Bot API.
 * Block-level tags → newlines. Inline wrappers → removed.
 * Markdown code fences and <pre lang="..."> wrappers → unwrapped.
 * Telegram supports: b, strong, i, em, u, ins, s, strike, del,
 *                    code, pre, a, tg-spoiler, tg-emoji, blockquote.
 */
export function sanitizeTelegramHtml(text: string): string {
  return text
    .replace(MARKDOWN_FENCE, "$1")
    .replace(PRE_WITH_ATTRS, "$1")
    .replace(BLOCK_TAGS, "\n")
    .replace(BR_TAGS, "\n")
    .replace(INLINE_STRIP, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
