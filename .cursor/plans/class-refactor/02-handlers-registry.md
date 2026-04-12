# Subtask 02: Handlers — classes + HandlerRegistry

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [01 — Services: interfaces + classes](./01-services-classes.md)
- Next: [03 — Entry: VoxLogisBot](./03-entry-voxlogis-bot.md)

## Objective

Replace `createWeatherCommandHandler` / `createSummaryTextHandler` factory functions with **handler classes** exposing `async handle(ctx: Context): Promise<void>`. Replace `registerHandlers(bot, deps)` with a **`HandlerRegistry`** class whose method (e.g. `register(bot: Bot): void`) performs the same `bot.command` / `bot.on` wiring, including the **inline `/start` handler** body unchanged.

## Context

Files:

- `src/handlers/weather.handler.ts` — today returns async closure using `deps.weather` / `deps.llm`.
- `src/handlers/summary.handler.ts` — same with `deps.parser` / `deps.llm`, plus util imports.
- `src/handlers/index.ts` — exports `BotDeps`, `registerHandlers`.

After [01](./01-services-classes.md), `BotDeps` should still type fields as **`LlmService` / `WeatherService` / `ParserService` interfaces**, not concrete classes.

## Steps

1. **`weather.handler.ts`**
   - Export `export class WeatherCommandHandler` (or equivalent name).
   - Constructor accepts `{ weather: WeatherService; llm: LlmService }` (same subset as today).
   - Move the entire async handler body into `handle(ctx: Context)` with **no logic edits** (regex for `/weather`, `replyWithChatAction`, try/catch messages, `city_not_found` / `timeout` branches).

2. **`summary.handler.ts`**
   - Export `export class SummaryTextHandler` with constructor `{ parser: ParserService; llm: LlmService }`.
   - Move body into `handle(ctx)`; keep imports from `../util/*` as they are until [04](./04-utils-static-classes.md).

3. **`HandlerRegistry`**
   - Add `export class HandlerRegistry` (in `src/handlers/index.ts` **or** a new `src/handlers/handler-registry.ts` re-exported from `index.ts` — choose one; prefer **single file** if it stays small, else split for clarity).
   - Constructor stores `BotDeps` (or individual services if you prefer, but keep the same shape as today’s `registerHandlers`).
   - Method `register(bot: Bot): void` registers:
     - `bot.command("start", …)` — **copy verbatim** the reply string from current `registerHandlers`.
     - `bot.command("weather", (ctx) => this.weatherHandler.handle(ctx))` or equivalent binding — ensure `this` is correct (arrow vs bound method).
     - `bot.on("message:text", (ctx) => this.summaryHandler.handle(ctx))`.
   - Remove `registerHandlers` function export; export `HandlerRegistry` instead.

4. **`src/bot.ts`**
   - Replace `registerHandlers(bot, deps)` with `new HandlerRegistry(deps).register(bot)` (adjust import path).
   - `bot.catch` remains as-is for this subtask (moved to `VoxLogisBot` in [03](./03-entry-voxlogis-bot.md)).

5. Run `npm run build`.

## Acceptance criteria

- [ ] No `createWeatherCommandHandler` / `createSummaryTextHandler` / `registerHandlers` symbols remain in `src/handlers/`.
- [ ] `HandlerRegistry` encapsulates all Grammy registrations previously in `registerHandlers`.
- [ ] `/start`, `/weather`, and `message:text` wiring is identical (same commands, same filter behaviour for slash-prefixed text in summary handler).
- [ ] `npm run build` passes; no unused imports or parameters.

## Notes / risks

- **Binding:** If you pass `this.summaryHandler.handle` as a listener, bind it or use wrappers so `this` inside `handle` refers to the handler instance when you later add private helper methods.
- Keep **`BotDeps`** export on `handlers/index.ts` (or alongside `HandlerRegistry`) so `bot.ts` typing stays simple.
