# Subtask 03: Entry — VoxLogisBot class

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [02 — Handlers + HandlerRegistry](./02-handlers-registry.md)
- Next: [04 — Utils: static-method classes](./04-utils-static-classes.md)

## Objective

Wrap startup in `export class VoxLogisBot` with **`async start(): Promise<void>`** that performs env validation, service construction, Grammy `Bot` creation, `HandlerRegistry.register`, `bot.catch` installation, log line, and `await bot.start()`. Keep **`import "dotenv/config"`** at the top of the entry module (side effect must run before reading `process.env`). Preserve the current `main().catch` top-level bootstrap pattern **or** equivalent minimal IIFE — the process must still exit non-zero on fatal startup errors.

## Context

Current `src/bot.ts`:

- `requireEnv` — console error Russian string + `process.exit(1)`.
- Service construction via `new` after [01](./01-services-classes.md).
- `HandlerRegistry` after [02](./02-handlers-registry.md).
- `bot.catch` — logging, `GrammyError` / `HttpError` / `Error` reason mapping, `llm.wrapInPersona` error path, fallback `ctx.reply` string.

## Steps

1. Introduce `VoxLogisBot` class (same file `src/bot.ts` unless you split — default **keep single file** for minimal churn).
   - **Private** `requireEnv(name: string): string` as a private static or instance method — behaviour identical to current function.
   - Private fields or locals inside `start()` for `Bot`, services, and registry — match current **single shared `llm` instance** used in `bot.catch` and handlers (construct once, pass same references).

2. `start()` should:
   - Read `TELEGRAM_BOT_TOKEN`, `OPENWEATHER_API_KEY`, `GEMINI_API_KEY` via `requireEnv`.
   - Instantiate services and `new Bot(token)`.
   - `new HandlerRegistry({ llm, weather, parser }).register(bot)`.
   - Assign `bot.catch` with the **same** logic and strings as today.
   - `console.error` the “долгий опрос” line (exact same message).
   - `await bot.start()`.

3. Replace `async function main` with:

   ```ts
   await new VoxLogisBot().start();
   ```

   inside a tiny async bootstrap, or `new VoxLogisBot().start().catch(...)` at top level — ensure unhandled rejections still `process.exit(1)` as today.

4. Run `npm run build`.

## Acceptance criteria

- [ ] `VoxLogisBot` exists with public `start(): Promise<void>` and encapsulates the former `main` body.
- [ ] `import "dotenv/config"` remains the first import in `src/bot.ts`.
- [ ] Environment validation messages and `process.exit(1)` behaviour unchanged.
- [ ] `bot.catch` behaviour unchanged (including nested try/catch around `llm.wrapInPersona`).
- [ ] `npm run build` passes.

## Notes / risks

- Do **not** move `dotenv/config` into the class constructor in a way that runs **after** `requireEnv` could be called from elsewhere; keep module top import.
- Ensure `noUnusedLocals`: if you extract helpers, every symbol must be used or omitted.
