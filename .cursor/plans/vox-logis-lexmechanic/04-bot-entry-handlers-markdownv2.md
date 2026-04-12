# Subtask 04: Bot entry, handlers & MarkdownV2

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — Project tooling & environment](./01-project-tooling-and-env.md), [02 — LLM persona service](./02-llm-persona-service.md), [03 — Weather & parser services](./03-weather-and-parser-services.md)
- Next: none

## Objective

Implement **`src/bot.ts`** as the **sole entry** wiring grammY: load config from env, instantiate services, register handlers, start long polling. Implement handlers for **`/weather [city]`**, **URL-in-message** summarization with **MarkdownV2** (bold title, bullets inside spoiler `||...||`), and **persona-wrapped errors**.

## Context

- Token: `TELEGRAM_BOT_TOKEN` ([01](./01-project-tooling-and-env.md)).
- Services: [02](./02-llm-persona-service.md), [03](./03-weather-and-parser-services.md).
- Replace/refactor legacy wiring from `src/main.ts` + `src/handlers/index.ts` patterns.
- Telegram **MarkdownV2** reference: bold `*title*`, spoiler `||text||`; many characters must be escaped (see grammY `escapeMarkdown` or manual mapping).

## Steps

1. **`src/bot.ts`**
   - `dotenv/config` (or manual `config()` at top).
   - Read env vars; fail fast with clear console message if missing.
   - `const bot = new Bot(token)`; register handlers; `bot.catch` for logging + user-facing persona error via [02](./02-llm-persona-service.md) where safe (avoid recursive LLM on rate limits — optional fallback static string).
   - `bot.start()` long polling.

2. **`/weather` handler** (e.g. `src/handlers/weather.handler.ts`)
   - Command pattern: `/weather` with **city** from message text (remainder after command); validate non-empty city.
   - Call **WeatherService** → build factual string → **`LLMService.wrapInPersona(..., 'weather')`** → `ctx.reply` with default HTML or plain; **MarkdownV2 only if escaping is guaranteed**.

3. **URL handler** (e.g. `src/handlers/url.handler.ts` or `summary.handler.ts`)
   - On **text messages**, detect HTTP(S) URLs (prefer `ctx.entities("url")` and `text_link`; supplement with regex if needed).
   - For **first URL** (document behavior): **ParserService** → build prompt for OpenAI: title + excerpt, instruction for **3–5 Russian bullets**, Lexmechanicus — either via **`wrapInPersona(..., 'summary')`** or a dedicated `summarizePage` in LLM service that internally uses the same persona (must remain one coherent design with [02](./02-llm-persona-service.md)).
   - Format reply **`parse_mode: 'MarkdownV2'`**:
     - **Bold** page title: `*${escapedTitle}*`
     - Body: bullet lines inside **spoiler**: `|| ... ||` (escape inner content for MarkdownV2).
   - Send “ritual in progress” optional `ctx.replyWithChatAction` / short status if desired (not required).

4. **Errors**
   - Grammy/API/send errors: log + reply with **`wrapInPersona(String(reason), 'error')`** when possible without infinite loops.
   - Weather/parser/OpenAI failures: catch, pass error message into persona wrapper.

5. **Exports** — `src/handlers/index.ts` exporting `registerHandlers(bot, deps)` to keep `bot.ts` slim.

6. **Cleanup** — Remove or deprecate `src/main.ts`, old service names (`openai.service.ts`, etc.), and update any docs only if already present (no new README required by this plan).

## Acceptance criteria

- [ ] Running **`npm run dev`** starts **`src/bot.ts`** and bot responds in Telegram.
- [ ] **`/weather London`** (or Cyrillic city) returns Lexmechanicus-styled text grounded in API data.
- [ ] Message containing `https://example.com` triggers fetch → summary; reply uses **MarkdownV2** with **bold title** and **spoiler** around bullet list.
- [ ] Forced failures (wrong token, bad URL) yield **persona error** messages, not raw JSON stacks in chat.
- [ ] `package.json` **`start`** runs **`node dist/bot.js`** after `build`.

## Notes / risks

- **MarkdownV2 escaping** is the primary integration bug source; add a tiny `escapeMarkdownV2` util and tests or golden examples.
- **Spoiler length:** Telegram may limit message length; truncate bullets if needed.
- **Concurrent URL + command:** Define precedence (e.g. ignore URLs if message starts with `/` command other than passthrough).
