# Subtask 03: Weather & parser services

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — Project tooling & environment](./01-project-tooling-and-env.md)
- Next: [04 — Bot entry, handlers & MarkdownV2](./04-bot-entry-handlers-markdownv2.md)

## Objective

Implement **`src/services/weather.service.ts`** (OpenWeatherMap **current** weather by city via **axios**) and **`src/services/parser.service.ts`** (fetch HTML, **cheerio**: title from `<title>`, main text from `<article>` or `<body>`, strip `script`/`style`).

## Context

- Weather API key: `OPENWEATHER_API_KEY` ([01](./01-project-tooling-and-env.md)).
- OpenWeather **Current Weather Data** endpoint (implementer picks exact URL path, e.g. `https://api.openweathermap.org/data/2.5/weather`) with `q={city}` and `appid`.
- Parser feeds [02 — LLM persona service](./02-llm-persona-service.md) / [04](./04-bot-entry-handlers-markdownv2.md) with plain text; may reuse patterns from existing `src/services/page.service.ts` and `src/util/html.ts` or replace them.
- **axios** is required for weather HTTP; parser may use **axios** for GET or `fetch` — plan prefers **axios** for consistency with requirements.

## Steps

### Weather service

1. Create `src/services/weather.service.ts` exporting e.g. `createWeatherService(apiKey: string)`.
2. Implement **`getCurrentByCity(city: string)`** returning a **structured object** or short **raw fact string** (temp, conditions, humidity, wind, city name, units) suitable as input to `wrapInPersona(..., 'weather')` in [04](./04-bot-entry-handlers-markdownv2.md).
3. Use **axios** with timeouts; map HTTP 404 / invalid city to a clear error type or message for persona-wrapped errors.
4. Choose units (`metric` recommended for Russian context) and document in code.

### Parser service

1. Create `src/services/parser.service.ts` exporting e.g. `createParserService()` or plain async functions.
2. Implement **`parseUrl(url: string)`** (or similarly named) that:
   - Fetches HTML with **axios** (follow redirects up to a safe limit; set sensible `maxContentLength` or stream + cap).
   - Loads HTML with **cheerio**.
   - Extracts **title** from `<title>` (trim, decode entities if needed).
   - Extracts **main text**: prefer `article` (first or concatenation of top articles — document choice); fallback to `body`.
   - Removes `script`, `style`, `noscript` before text extraction.
   - Normalizes whitespace; produces a **single plain-text block** with a **reasonable max length** (e.g. 8–12k chars) for LLM input.
3. Return type: `{ title: string; text: string }` or equivalent.

## Acceptance criteria

- [ ] `src/services/weather.service.ts` uses **axios** + OpenWeatherMap for **current** weather by **city name**.
- [ ] `src/services/parser.service.ts` uses **cheerio**, `<title>` for title, `<article>` or `<body>` for body, strips **scripts/styles**.
- [ ] Both services are **strict**-mode TypeScript-clean and importable from handlers.
- [ ] Network failures produce errors that [04](./04-bot-entry-handlers-markdownv2.md) can pass to `wrapInPersona(..., 'error')`.

## Notes / risks

- **Robots / paywalls:** Many sites block bots or return challenge pages; errors should degrade gracefully with persona message.
- **Encoding / charset:** Ensure axios handles UTF-8; fix charset from `<meta>` if needed.
- **XSS:** Stripping tags is for text extraction only; never execute scripts (cheerio does not run JS by default — good).
