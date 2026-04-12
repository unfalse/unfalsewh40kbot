# VoxLogisBot

*From the databanks of the Omnissiah flows all knowledge. VoxLogisBot channels that sacred stream through the Telegram network, delivering intelligence, weather augury, and scroll-parsing rites to the uninitiated masses.*

VoxLogisBot is a Warhammer-themed Telegram bot built with [grammY](https://grammy.dev/) (TypeScript/Node.js). It integrates Google Gemini for LLM-powered responses, OpenWeatherMap for current weather data, and an HTTP page parser for URL summarisation — all wrapped in the persona of Lexmechanicus, a mildly exasperated servant of the Machine God.

---

## Features

- **`/ask`** — plain question-and-answer via Gemini LLM
- **`/request`** — Lexmechanicus persona chat replies
- **`/weather [city]`** — current weather conditions styled by the LLM
- **Mention handling** — reply when the bot is `@mentioned` in a message
- **URL summarisation** — fetch any URL in a message, parse the page, return a spoiler-wrapped bullet-point summary
- Health check HTTP server for container orchestration
- Long polling transport (no webhook configuration required)

---

## Project Structure

```
src/
├── bot.ts                        # Entry point: VoxLogisBot class, wiring, health server
├── handlers/
│   ├── index.ts                  # HandlerRegistry — registers all commands and message handlers
│   ├── ask.handler.ts            # /ask — plain LLM Q&A
│   ├── request.handler.ts        # /request — LLM chat persona
│   ├── mention.handler.ts        # Replies when the bot is @mentioned
│   ├── summary.handler.ts        # URL in text → fetch → LLM summary
│   └── weather.handler.ts        # /weather — OpenWeather + LLM styling
├── services/
│   ├── llm.service.ts            # Gemini (gemini-2.5-flash-lite), persona wrappers
│   ├── parser.service.ts         # HTTP fetch + Cheerio HTML → title + body text
│   └── weather.service.ts        # OpenWeatherMap current weather
└── util/
    ├── markdownv2.ts             # MarkdownV2 escaping helpers for Telegram
    └── url.ts                    # URL extraction, SSRF-blocking for non-public addresses
```

---

## Bot Initialisation

`VoxLogisBot` in `src/bot.ts`:

1. Loads environment variables via `dotenv/config`.
2. `VoxLogisBot.requireEnv` validates that `TELEGRAM_BOT_TOKEN`, `OPENWEATHER_API_KEY`, and `GEMINI_API_KEY` are present — exits immediately if any are missing.
3. Instantiates `GeminiLlmService`, `OpenWeatherService`, and `HttpParserService`.
4. Passes all services to `HandlerRegistry` and calls `.register(bot)` to attach all routes.
5. Attaches a global `bot.catch` handler — attempts an LLM-wrapped error persona reply; falls back to a static message on failure.
6. Starts a plain HTTP server on `HTTP_PORT` (default `3000`) returning `200 OK` for health checks.
7. Calls `await bot.start()` — **long polling**, no webhook setup required.

---

## Middleware Chain

Handlers are registered in the following order inside `HandlerRegistry`. There are no `bot.use()` plugins (no session, conversations, i18n, etc.).

| # | Trigger | Handler |
|---|---------|---------|
| 1 | `bot.command("start")` | Static Russian intro message |
| 2 | `bot.command("weather")` | `WeatherHandler` |
| 3 | `bot.command("request")` | `RequestHandler` |
| 4 | `bot.command("ask")` | `AskHandler` |
| 5 | `bot.on("message:text")` | `MentionHandler` — fires when text `@mentions` the bot |
| 6 | `bot.on("message:text")` | `SummaryTextHandler` — fires when text contains a URL |

**Mutual exclusivity:** Handlers are registered as `(ctx) => handler.handle(ctx)` and never call `next()`. `SummaryTextHandler` explicitly skips execution if the message contains a bot mention, so the two `message:text` handlers are mutually exclusive by design.

---

## Commands

| Command | Behaviour |
|---------|-----------|
| `/start` | Static Russian introduction: bot name, available features (`/weather`, URL summaries, mention for questions). |
| `/weather [city]` | No city → LLM error persona. With city → OpenWeatherMap current conditions → `formatFactsForLlm` → LLM `weather` persona reply. Errors mapped for `city_not_found`, `timeout`, and generic failures. |
| `/request [text]` | Empty → LLM error persona. With text → sends typing action → LLM `chat` persona (Lexmechanicus, slightly annoyed). |
| `/ask [text]` | Empty → static hint (plain Russian). With text → sends typing action → LLM `plain` persona (neutral helpful assistant, responds in the language of the question). LLM errors fall back to a static Russian error message (not a persona reply). |

---

## Non-Command Message Handling

### Mention Handler

When an incoming text message contains an `@mention` of the bot:

1. The mention is stripped from the message text.
2. If the stripped text is empty (i.e. the message contained only the mention), a static Russian prompt is returned immediately without calling the LLM.
3. Otherwise, the remaining text is sent to the LLM with the `chat` persona (Lexmechanicus).
4. The reply is sent back to the chat.

### URL Summary Handler

When an incoming text message (that is not a command and does not mention the bot) contains a URL:

1. The URL is extracted from message entities or via regex.
2. `UrlUtil.assertPublicHttpUrl` validates the URL and blocks private/loopback address ranges.
3. `HttpParserService` fetches the page (15 s timeout, 5 MB cap, browser User-Agent) and extracts the title and body text using Cheerio.
4. The content is sent to the LLM with the `summary` persona.
5. The reply is formatted as MarkdownV2: **bold title** followed by spoiler-wrapped (`||...||`) bullet points.

---

## Services

### LLM Service (`src/services/llm.service.ts`)

- Provider: `@google/genai` (`GoogleGenAI`), model `gemini-2.5-flash-lite`.
- Entry point: `wrapInPersona(content, contextType)`.
- Context types and their characteristics:

| Context | Persona | Notes |
|---------|---------|-------|
| `weather` | Lexmechanicus | Weather-specific tone and token limits |
| `summary` | Lexmechanicus | Produces bullet-point summaries |
| `error` | Lexmechanicus | Wraps error messages in-character |
| `chat` | Lexmechanicus | General conversation, mildly annoyed |
| `plain` | Neutral assistant | No Warhammer persona; responds in the user's language |

- User content is capped at **28,000 characters** before being sent to Gemini.

### Parser Service (`src/services/parser.service.ts`)

- `HttpParserService`: axios GET with a 15-second timeout, 5 MB response cap, and a browser User-Agent header.
- HTML parsed with Cheerio.
- Title: first `<title>` tag, or `"Безымянный свиток"` (unnamed scroll) if absent.
- Body: prefers `<article>` content over `<body>`; strips `<script>`, `<style>`, `<noscript>`, SVG, iframes, and `<template>` elements; whitespace-normalised; capped at **12,000 characters**.
- URL validated with `UrlUtil.assertPublicHttpUrl` before fetching (blocks private and loopback ranges).

### Weather Service (`src/services/weather.service.ts`)

- `OpenWeatherService`: `GET /data/2.5/weather` with `units=metric` and `lang=ru`.
- Mapped error codes: `city_not_found` (HTTP 404), `timeout`.
- `formatFactsForLlm`: produces human-readable Russian lines covering city, temperature, feels-like, description, humidity, pressure, and optional wind speed.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Token issued by [@BotFather](https://t.me/BotFather) |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `OPENWEATHER_API_KEY` | Yes | — | OpenWeatherMap API key |
| `HTTP_PORT` | No | `3000` | Port for the health check HTTP server |

---

## Setup & Configuration

**Prerequisites:** Node.js `>=20`, npm.

```bash
# 1. Clone the repository
git clone <repo-url>
cd warhammer-tg-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, OPENWEATHER_API_KEY
```

---

## Running

### Development

Uses `nodemon` and `ts-node` for live reload:

```bash
npm run dev
```

### Production

Compile TypeScript, then run the compiled output:

```bash
npm run build
npm start
```

### Docker

The Dockerfile uses a two-stage build:

1. **Builder** (`node:20-alpine`): installs all dependencies and runs `npm run build`.
2. **Runtime** (`node:20-alpine`): installs production dependencies only, copies `dist/` from the builder stage, runs as the unprivileged `node` user, and exposes port `3000`.

`.env` is excluded from the image via `.dockerignore`. Provide environment variables at runtime:

```bash
docker build -t voxlogisbot .

# Using --env-file
docker run --env-file .env -p 3000:3000 voxlogisbot

# Or passing variables individually
docker run \
  -e TELEGRAM_BOT_TOKEN=... \
  -e GEMINI_API_KEY=... \
  -e OPENWEATHER_API_KEY=... \
  -p 3000:3000 voxlogisbot
```

The health check endpoint is available at `http://localhost:3000/` and returns `200 OK`.
