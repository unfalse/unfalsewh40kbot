/** https://core.telegram.org/bots/api#markdownv2-style */
export class MarkdownV2 {
  private static readonly SPECIAL = "_*[]()~`>#+=|{}.!-";

  static escape(text: string): string {
    let s = text.replace(/\\/g, "\\\\");
    for (const ch of MarkdownV2.SPECIAL) {
      s = s.split(ch).join("\\" + ch);
    }
    return s;
  }
}
