export class UrlUtil {
  private static readonly URL_RE = /https?:\/\/[^\s]+/gi;

  private static readonly BLOCKED = new Set([
    "localhost",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
  ]);

  private static readonly PRIVATE_IP_RE =
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

  static extractFirstHttpUrl(text: string): string | undefined {
    return text.match(UrlUtil.URL_RE)?.[0];
  }

  static assertPublicHttpUrl(raw: string): URL {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new Error("invalid_url");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("bad_protocol");
    }
    const host = u.hostname.toLowerCase();
    if (UrlUtil.BLOCKED.has(host) || host.endsWith(".localhost")) {
      throw new Error("forbidden_host");
    }
    if (UrlUtil.PRIVATE_IP_RE.test(host)) {
      throw new Error("private_ip");
    }
    return u;
  }

  static collectUrlsFromMessage(
    text: string,
    entities?: { type: string; offset: number; length: number; url?: string }[],
  ): string[] {
    const out: string[] = [];
    if (entities) {
      for (const e of entities) {
        if (e.type === "url") {
          out.push(text.slice(e.offset, e.offset + e.length));
        } else if (e.type === "text_link" && e.url) {
          out.push(e.url);
        }
      }
    }
    const fromRegex = text.match(UrlUtil.URL_RE);
    if (fromRegex) {
      for (const u of fromRegex) {
        if (!out.includes(u)) out.push(u);
      }
    }
    return out;
  }
}
