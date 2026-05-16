import { readFileSync } from "fs";
import { isAbsolute, join } from "path";
import yaml from "js-yaml";
import type { Language } from "../services/preferences.service";

type L10n = { ru: string; en: string };

interface Messages {
  meta: {
    startup_log: string;
    start_command: L10n;
  };
  handlers: {
    ask: { empty_query: L10n; error: L10n };
    mention: { empty: L10n };
    weather: {
      empty_city_prompt: L10n;
      city_not_found: L10n;
      timeout: L10n;
      error_prefix: L10n;
    };
    summary: { private_url_prompt: L10n; parse_error_prefix: L10n };
    request: { empty_query_prompt: L10n; error_prefix: L10n };
    whask: { empty_query: L10n; error: L10n };
    lang: { usage: L10n; set_ru: L10n; set_en: L10n };
  };
  llm: {
    html_format_rule: string;
    systems: { lex: string; whask: string; plain: string };
    instructions: {
      weather: string;
      summary: string;
      error: string;
      chat: string;
      whask: string;
      plain: string;
    };
    fallback_error: L10n;
  };
}

function resolveMessagesPath(): string {
  const env = process.env["MESSAGES"];
  if (!env) return join(__dirname, "lexmechanic.yaml");
  if (isAbsolute(env)) return env;
  return join(__dirname, env);
}

const messagesPath = resolveMessagesPath();

const raw = readFileSync(messagesPath, "utf-8");
export const messages = yaml.load(raw) as Messages;

export function t(msg: L10n, lang: Language): string {
  return msg[lang];
}

export function fmt(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    template,
  );
}
