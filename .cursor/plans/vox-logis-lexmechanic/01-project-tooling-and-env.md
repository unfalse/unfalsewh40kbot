# Subtask 01: Project tooling & environment

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — LLM persona service](./02-llm-persona-service.md) and/or [03 — Weather & parser services](./03-weather-and-parser-services.md) (both can start after this subtask)

## Objective

Align the repository with the **Vox-Logis Lexmechanic** stack and scripts: required npm dependencies, **`strict`: true** TypeScript, **`.env.example`**, and a clear path to **`src/bot.ts`** as the application entry (replacing or superseding `src/main.ts` per the overview).

## Context

- Current `package.json` (`c:\projects\warhammer-tg-bot_CURSOR\package.json`): grammY, cheerio, dotenv, openai; dev uses **`tsx watch`** — the product owner asked for **`dev` = nodemon + ts-node** (add **nodemon**, **ts-node**; adjust scripts accordingly).
- Current `tsconfig.json` already has `"strict": true` — preserve and avoid regressions.
- Existing sources to retire or refactor: `src/main.ts`, `src/config.ts`, `src/handlers/*`, `src/services/*`, `src/ritual.ts` — see [Plan overview](./00-overview.md).

## Steps

1. **Dependencies** — Ensure `package.json` includes at minimum: `grammy`, `typescript`, `ts-node`, `nodemon`, `dotenv`, `axios`, `cheerio`, `openai`. Add `@types/node` if not present. Remove or keep `tsx` only if still needed; primary **`dev`** script should match the requirement (**nodemon** invoking **ts-node** on `src/bot.ts`).
2. **Scripts**
   - `dev`: e.g. `nodemon --exec ts-node --esm src/bot.ts` or equivalent that works with `"type": "module"` if retained; verify ESM/CJS compatibility between ts-node and `module`/`moduleResolution` (`NodeNext`).
   - `build`: `tsc`
   - `start`: `node dist/bot.js` (after `rootDir`/`outDir` mirror `src/bot.ts` → `dist/bot.js`)
3. **TypeScript** — Confirm `tsconfig.json` has `"strict": true` and that `include` covers `src/**/*.ts`.
4. **Environment template** — Add or update **`.env.example`** at repo root with exactly these variable names (document purpose in comments):
   - `TELEGRAM_BOT_TOKEN`
   - `OPENWEATHER_API_KEY`
   - `OPENAI_API_KEY`
5. **Config loading** — Decide whether `src/config.ts` remains (refactored) or is inlined in `src/bot.ts` in a later subtask; for this subtask, only ensure env var names match `.env.example` and that no secrets are committed.
6. **Folder placeholders** — Ensure `src/handlers/` and `src/services/` exist (empty `index.ts` exports optional) so later subtasks have stable paths.

## Acceptance criteria

- [ ] `package.json` lists: grammY, TypeScript, ts-node, nodemon, dotenv, axios, cheerio, openai (and working dev/build/start scripts targeting **`src/bot.ts`** / **`dist/bot.js`**).
- [ ] `npm run dev`, `npm run build`, and `npm run start` are defined and documented in [Plan overview](./00-overview.md) verification (executor runs them locally).
- [ ] `tsconfig.json` has `"strict": true`.
- [ ] `.env.example` exists with the three required keys (names match specification).
- [ ] No real API tokens or bot tokens are present in the repo.

## Notes / risks

- **ts-node + ESM:** With `"type": "module"` and `NodeNext`, nodemon/ts-node flags may need `--esm` or `NODE_OPTIONS=--loader ts-node/esm` depending on Node version; validate on **Node ≥ 20** per existing `engines`.
- **Duplicate entrypoints:** If both `main.ts` and `bot.ts` exist briefly during migration, remove confusion by updating `package.json` scripts only once `bot.ts` is the canonical entry ([04](./04-bot-entry-handlers-markdownv2.md)).
