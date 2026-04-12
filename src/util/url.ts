const URL_RE = /https?:\/\/[^\s]+/gi;

export function extractFirstHttpUrl(text: string): string | undefined {
  const m = text.match(URL_RE);
  return m?.[0];
}

const BLOCKED = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

export function assertPublicHttpUrl(raw: string): URL {
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
  if (BLOCKED.has(host) || host.endsWith(".localhost")) {
    throw new Error("forbidden_host");
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error("private_ip");
  }
  return u;
}

export function collectUrlsFromMessage(
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
  const fromRegex = text.match(URL_RE);
  if (fromRegex) {
    for (const u of fromRegex) {
      if (!out.includes(u)) out.push(u);
    }
  }
  return out;
}
