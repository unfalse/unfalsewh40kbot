/** https://core.telegram.org/bots/api#markdownv2-style */
const MD_SPECIAL = "_*[]()~`>#+=|{}.!-" as const;

export function escapeMarkdownV2(text: string): string {
  let s = text.replace(/\\/g, "\\\\");
  for (const ch of MD_SPECIAL) {
    s = s.split(ch).join("\\" + ch);
  }
  return s;
}

