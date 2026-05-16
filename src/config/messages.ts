import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

interface Messages {
  handlers: {
    ask: { empty_query: string; error: string };
    mention: { empty: string };
    weather: {
      empty_city_prompt: string;
      city_not_found: string;
      timeout: string;
      error_prefix: string;
    };
    summary: { private_url_prompt: string; parse_error_prefix: string };
    request: { empty_query_prompt: string; error_prefix: string };
    whask: { empty_query: string; error: string };
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
    fallback_error: string;
  };
}

const messagesPath = process.env["MESSAGES"]
  ? join(process.cwd(), process.env["MESSAGES"])
  : join(__dirname, "shodan.yaml");

const raw = readFileSync(messagesPath, "utf-8");
export const messages = yaml.load(raw) as Messages;

export function fmt(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    template,
  );
}
