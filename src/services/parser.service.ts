import axios, { type AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { UrlUtil } from "../util/url";

const MAX_TEXT = 12_000;

export type ParsedPage = {
  title: string;
  text: string;
};

export type HnStory = {
  title: string;
  url: string;
  score: number;
};

export interface ParserService {
  parseUrl(url: string): Promise<ParsedPage>;
  fetchHnAiNews(): Promise<HnStory[]>;
}

export class HttpParserService implements ParserService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
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
  }

  async parseUrl(raw: string): Promise<ParsedPage> {
    const safe = UrlUtil.assertPublicHttpUrl(raw).toString();

    const { data: html } = await this.http.get<string>(safe, { responseType: "text" });
    const $ = cheerio.load(html);

    const title =
      $("title").first().text().replace(/\s+/g, " ").trim() || "Безымянный свиток";

    $("script, style, noscript, svg, iframe, template").remove();

    let root = $("article").first();
    if (!root.length) {
      root = $("body");
    }

    const text = root.text().replace(/\s+/g, " ").trim();
    const clipped = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;

    return { title, text: clipped };
  }

  async fetchHnAiNews(): Promise<HnStory[]> {
    const { data: html } = await this.http.get<string>("https://news.ycombinator.com/", {
      responseType: "text",
    });
    const $ = cheerio.load(html);

    const keywords = [
      "ai",
      "llm",
      "gpt",
      "claude",
      "gemini",
      "mistral",
      "neural",
      "model",
      "openai",
      "anthropic",
      "machine learning",
      "deep learning",
    ];
    const keywordRegex = new RegExp(keywords.join("|"), "i");

    const stories: HnStory[] = [];
    $(".athing").each((_i, el) => {
      const titleEl = $(el).find(".titleline > a").first();
      const title = titleEl.text().trim();
      const url = titleEl.attr("href") || "";

      if (!title || !keywordRegex.test(title)) return;

      // Score находится в следующей строке <tr> в элементе `.score`
      const scoreEl = $(el).next(".subtext").find(".score").first();
      const scoreText = scoreEl.text().match(/\d+/)?.[0];
      const score = scoreText ? parseInt(scoreText, 10) : 0;

      // Абсолютный URL
      const absoluteUrl = url.startsWith("http")
        ? url
        : `https://news.ycombinator.com/${url}`;

      stories.push({ title, url: absoluteUrl, score });
    });

    return stories.slice(0, 10);
  }
}
