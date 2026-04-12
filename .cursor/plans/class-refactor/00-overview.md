# Plan: Class-based OOP refactor (no behaviour change)

## Goal

Restructure the TypeScript sources under `src/` from factory functions and plain object “services” to **class-based OOP**: services and handlers as classes implementing exported interfaces, a **`HandlerRegistry`** replacing `registerHandlers`, and a **`VoxLogisBot`** entry class with `start(): Promise<void>`. **No new features**, **no new npm dependencies**, and **no intentional changes** to bot commands, user-visible strings, HTTP behaviour, or error handling paths.

## Scope

- **In scope:** `src/services/*.ts`, `src/handlers/*.ts`, `src/bot.ts`, optionally `src/util/*.ts` (static utility classes for consistency).
- **Out of scope:** `package.json` dependency changes, `tsconfig.json` relaxations, renaming `src/` tree layout except where a filename clearly improves clarity (default: keep paths).

## Success criteria

- After **each** numbered subtask, `npm run build` (strict `tsc`) passes with `noUnusedLocals` / `noUnusedParameters` satisfied.
- Runtime behaviour matches pre-refactor: same `/start` text, `/weather` flow, text-message URL summary flow, `bot.catch` persona/error fallbacks, and service-side errors (`city_not_found`, `timeout`, URL validation, etc.).
- Each service file exports an **interface** (contract) and a **class** (implementation) from the **same file**; handlers expose a public `handle(ctx)` method.

## Suggested interface / class naming

Avoid a single name serving as both interface and class (illegal in one scope). Use descriptive implementation class names, keep **interface** names aligned with today’s type names so `BotDeps` stays readable:

| Area | Interface (contract) | Implementation class (example) |
|------|----------------------|----------------------------------|
| LLM | `LlmService` | `GeminiLlmService` |
| Weather | `WeatherService` | `OpenWeatherMapService` |
| Parser | `ParserService` | `HttpParserService` |

Adjust exact class names in implementation if you prefer shorter names, as long as the interface names and method signatures stay stable for callers.

## Dependency / execution order

1. Services are foundational types used by handlers and `bot.ts`; convert them first and switch construction sites to `new …` while keeping handler logic unchanged.
2. Handlers + registry depend on service interfaces; convert after services.
3. Entry (`VoxLogisBot`) depends on registry + wiring; refactor `bot.ts` after handlers compile.
4. Utils are leaf dependencies (`parser.service`, `summary` handler); static-class conversion last minimizes churn and keeps one consistent util style.

```mermaid
flowchart LR
  S1[01 Services]
  S2[02 Handlers]
  S3[03 Entry]
  S4[04 Utils]
  S1 --> S2 --> S3 --> S4
```

## Subtasks

Execute in order; each link is the authoritative spec for that slice.

1. [01 — Services: interfaces + classes](./01-services-classes.md)
2. [02 — Handlers + HandlerRegistry](./02-handlers-registry.md)
3. [03 — Entry: VoxLogisBot](./03-entry-voxlogis-bot.md)
4. [04 — Utils: static-method classes](./04-utils-static-classes.md)

## Verification (every subtask)

From repo root:

```bash
npm run build
```

Optional smoke (not required by this plan): run `npm start` with a valid `.env` and exercise `/start`, `/weather Москва`, and a plain-text message with a public HTTPS URL.

## Global risks and decisions

- **Import paths:** `src/bot.ts` currently uses `*.js` extensions in relative imports (CommonJS emit). Other files use extensionless imports. Do **not** mix styles within a file; follow the existing pattern per file unless TypeScript forces a change.
- **`BotDeps`:** Keep as a type describing interface-typed fields (`llm: LlmService`, etc.) so handlers depend on contracts, not concrete classes.
- **`bot.catch` closure:** Today it closes over `llm` for `wrapInPersona`. After `VoxLogisBot`, preserve the same closure semantics (same service instance, same error strings).
- **Subtask 04** touches `parser.service` and the summary handler: coordinate static util names so call sites stay obvious (`MarkdownV2.escape`, `UrlUtil.assertPublicHttpUrl`, etc.).

## Assumptions

- No other entrypoints import `create*` factories outside `src/` (only `src` is compiled).
- Test suite is absent; `tsc` is the gate.
