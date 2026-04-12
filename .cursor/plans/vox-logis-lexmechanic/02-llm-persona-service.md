# Subtask 02: LLM persona service

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — Project tooling & environment](./01-project-tooling-and-env.md)
- Next: [04 — Bot entry, handlers & MarkdownV2](./04-bot-entry-handlers-markdownv2.md) (after [03](./03-weather-and-parser-services.md) if doing linear order; **04** needs this subtask complete)

## Objective

Implement **`src/services/llm.service.ts`** using the **OpenAI** SDK with model **`gpt-4o-mini`**, exposing a method **`wrapInPersona(content: string, contextType: 'weather' | 'summary' | 'error')`** that returns **Telegram-friendly** Lexmechanicus-styled text (Russian/40k tone as specified).

## Context

- Env: `OPENAI_API_KEY` from [01](./01-project-tooling-and-env.md).
- Consumers: [04 — Bot entry, handlers & MarkdownV2](./04-bot-entry-handlers-markdownv2.md) will call this after weather facts, after URL summary task, and on errors.
- Persona vocabulary to weave into the **system prompt** (non-exhaustive guidance for the implementer): **Инфо-кристалл**, **Дух Машины**, **Благословенные данные**, **Ритуал сканирования**; tone = **Tech-Priest / Lexmechanicus**.
- **MarkdownV2:** The service may return plain text for `'error'` and `'weather'`, but for **`'summary'`** the handler may request structured segments; clarify in implementation whether `wrapInPersona` returns final MarkdownV2 or plain prose — [04](./04-bot-entry-handlers-markdownv2.md) owns final escaping for titles/URLs if split.

## Steps

1. Create **`src/services/llm.service.ts`** exporting a small factory or class, e.g. `createLlmService(apiKey: string)` to keep bot.ts testable.
2. Initialize **OpenAI** client (official `openai` package) with `gpt-4o-mini` as default model constant.
3. **System prompt** — Define a single strong system message that:
   - Establishes Lexmechanicus persona and the lexicon above.
   - States output must be **concise**, **Telegram-safe**, and for `summary` / `weather` avoid hallucinating facts beyond the provided `content`.
   - For **`contextType: 'weather'`**: rewrite **raw factual weather content** (passed in user message) into the persona voice without inventing numbers.
   - For **`contextType: 'summary'`**: input will be page title + extracted text or bullet task instruction; output should support **3–5 bullets in Russian**, Lexmechanicus tone, suitable for wrapping in spoiler by the handler.
   - For **`contextType: 'error'`**: transform error description into a short ritualistic apology/explanation, no stack traces.
4. Implement **`wrapInPersona(content, contextType)`** using `chat.completions` (or responses API if team standardizes — prefer stable chat completions for `gpt-4o-mini`).
5. Add minimal error handling: on API failure, either throw a typed error for [04](./04-bot-entry-handlers-markdownv2.md) to catch or return a fallback persona string (decide one approach and document it).

## Acceptance criteria

- [ ] File exists at `src/services/llm.service.ts` with **`wrapInPersona(content, contextType)`** typed as specified.
- [ ] Model used is **`gpt-4o-mini`** (configurable via optional constructor param is acceptable).
- [ ] System prompt references **Инфо-кристалл**, **Дух Машины**, **Благословенные данные**, **Ритуал сканирования** and enforces Lexmechanicus style.
- [ ] The three `contextType` branches behave distinctly (different user instructions or system addendum per type).
- [ ] `npm run build` passes with no `strict` violations.

## Notes / risks

- **Token limits:** Long `content` for `'summary'` should be truncated before the API call (coordinate with [03](./03-weather-and-parser-services.md) max length).
- **Latency & cost:** Every weather reply hits the LLM; acceptable for v1; optional caching is out of scope.
- **MarkdownV2 vs model output:** If the model emits raw `*`, `_`, etc., [04](./04-bot-entry-handlers-markdownv2.md) must escape or sanitize before `parse_mode: 'MarkdownV2'`.
