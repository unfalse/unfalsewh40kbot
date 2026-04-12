# Subtask 01: Services — interfaces + classes

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — Handlers + HandlerRegistry](./02-handlers-registry.md)

## Objective

Replace object-literal `create*` factories in `src/services/` with **exported interfaces** (same method names as today’s types) and **classes** that implement them. Update **only** the construction sites needed for the project to compile — principally `src/bot.ts` — while leaving handler files still using factory-style handlers for now (they only need the **type** imports to resolve to interfaces).

## Context

Current factories and shapes:

- `src/services/llm.service.ts` — `createLlmService`, type `LlmService`, `PersonaContext`, internal `MODEL` / `LEX_SYSTEM` / `userInstructionFor` unchanged in behaviour.
- `src/services/weather.service.ts` — `createWeatherService`, type `WeatherService`, `CurrentWeatherFacts`, axios instance config identical.
- `src/services/parser.service.ts` — `createParserService`, type `ParserService`, cheerio pipeline identical; still imports `assertPublicHttpUrl` from `../util/url` (unchanged in this subtask).

Reference: [Plan overview](./00-overview.md) naming table for interface vs class names.

## Steps

1. **`llm.service.ts`**
   - Replace `export type LlmService = { ... }` with `export interface LlmService { wrapInPersona(...): Promise<string>; }`.
   - Introduce `export class <ImplName> implements LlmService` moving the body of `createLlmService` into the constructor (hold `GoogleGenAI` + model) and `wrapInPersona` as an instance method.
   - Remove `createLlmService` **or** keep a one-line deprecated wrapper `export function createLlmService(...) { return new <ImplName>(...); }` — prefer **removal** to satisfy “class-based” and avoid dead exports; then update call sites.
   - Keep `PersonaContext` export and all string constants / token limits / error branches bit-identical.

2. **`weather.service.ts`**
   - Replace `export type WeatherService` with `export interface WeatherService`.
   - Move factory closure (axios instance) into class private fields; `getCurrentByCity` and `formatFactsForLlm` as methods with the same logic.
   - Remove `createWeatherService` (or same one-line wrapper rule as above; prefer removal).

3. **`parser.service.ts`**
   - Replace `export type ParserService` with `export interface ParserService`.
   - Move axios + `parseUrl` into a class implementing the interface; remove `createParserService` (prefer removal).

4. **`src/bot.ts`**
   - Replace `createLlmService(geminiKey)` with `new <ImplName>(geminiKey)` (and same for weather/parser).
   - Update imports to pull classes from the service modules; ensure no unused imports.

5. Run `npm run build` and fix any strictness issues (unused private fields, etc.).

## Acceptance criteria

- [ ] `src/services/llm.service.ts`, `weather.service.ts`, and `parser.service.ts` each export an **interface** and a **class** from the same file; **no** standalone object-literal service implementation remains.
- [ ] `src/bot.ts` constructs services with `new` and `npm run build` passes.
- [ ] No changes to public method behaviour, HTTP timeouts, URLs, error `message` strings thrown from services, or LLM config (model id, temperatures, max tokens, truncation threshold).
- [ ] `PersonaContext`, `CurrentWeatherFacts`, `ParsedPage` remain exported where they are today (same names).

## Notes / risks

- If you temporarily keep `create*` wrappers for ergonomics, `noUnusedLocals` may flag them if nothing imports them — removal is simpler.
- Parser still depends on util functions until [04 — Utils](./04-utils-static-classes.md); do not refactor `src/util/` in this subtask.
