import axios, { type AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { assertPublicHttpUrl } from "../util/url";

const MAX_TEXT = 12_000;

export type ParsedPage = {
  title: string;
  text: string;
};

export type ParserService = {
  parseUrl(url: string): Promise<ParsedPage>;
};

export function createParserService(): ParserService {
  const http: AxiosInstance = axios.create({
    timeout: 15_000,
    maxContentLength: 5 * 1024 * 1024,
    maxBodyLength: 5 * 1024 * 1024,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Vox-Logis-Lexmechanic/1.0; +https://t.me/)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    validateStatus: (s) => s >= 200 && s < 400,
  });

  return {
    async parseUrl(raw: string): Promise<ParsedPage> {
      const safe = assertPublicHttpUrl(raw).toString();

      const { data: html } = await http.get<string>(safe, { responseType: "text" });
      const $ = cheerio.load(html);

      const title = $("title").first().text().replace(/\s+/g, " ").trim() || "Безымянный свиток";

      $("script, style, noscript, svg, iframe, template").remove();

      let root = $("article").first();
      if (!root.length) {
        root = $("body");
      }

      const text = root.text().replace(/\s+/g, " ").trim();
      const clipped = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;

      return { title, text: clipped };
    },
  };
}
