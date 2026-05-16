import { readFileSync } from "fs";
import { isAbsolute, join } from "path";
import yaml from "js-yaml";

interface Messages {
  meta: {
    startup_log: string;
    start_command: string;
  };
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

function resolveMessagesPath(): string {
  const env = process.env["MESSAGES"];
  if (!env) return join(__dirname, "lexmechanic.yaml");
  if (isAbsolute(env)) return env;
  // относительный путь — резолвим из __dirname (src/config/ или dist/config/)
  // чтобы работало и при ts-node, и при node dist/
  return join(__dirname, env);
}

const messagesPath = resolveMessagesPath();

const raw = readFileSync(messagesPath, "utf-8");
export const messages = yaml.load(raw) as Messages;

export function fmt(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    template,
  );
}
