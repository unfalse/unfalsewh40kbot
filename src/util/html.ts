const BLOCK_TAGS = /\s*<\/?(p|div|section|article|header|footer|h[1-6]|ul|ol|li)(\s[^>]*)?\/?>\s*/gi;
const BR_TAGS = /\s*<br\s*\/?>\s*/gi;
const INLINE_STRIP = /<\/?(span|figure|img|table|thead|tbody|tr|td|th|caption)(\s[^>]*)?\/?>/gi;

/**
 * Strips HTML tags unsupported by Telegram Bot API.
 * Block-level tags are replaced with newlines; inline wrappers are removed.
 * Telegram supports: b, strong, i, em, u, ins, s, strike, del,
 *                    code, pre, a, tg-spoiler, tg-emoji, blockquote.
 */
export function sanitizeTelegramHtml(text: string): string {
  return text
    .replace(BLOCK_TAGS, "\n")
    .replace(BR_TAGS, "\n")
    .replace(INLINE_STRIP, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
