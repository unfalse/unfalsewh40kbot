# Subtask 04: Utils — static-method classes

## Plan links

- [Plan overview](./00-overview.md)
- Depends on: [03 — Entry: VoxLogisBot](./03-entry-voxlogis-bot.md)
- Next: none

## Objective

Convert `src/util/markdownv2.ts` and `src/util/url.ts` to **static-only utility classes** (no instances) with a **consistent naming scheme**, and update all imports/call sites. Behaviour of escaping, URL regex, blocked hosts, and `collectUrlsFromMessage` must remain **identical**.

## Context

Current consumers:

- `src/handlers/summary.handler.ts` — `escapeMarkdownV2`, `assertPublicHttpUrl`, `collectUrlsFromMessage`, `extractFirstHttpUrl`.
- `src/services/parser.service.ts` — `assertPublicHttpUrl`.

After [02](./02-handlers-registry.md), these live inside **`SummaryTextHandler.handle`** and **`HttpParserService`** (or your chosen parser class name).

## Steps

1. **Naming convention (pick one and apply everywhere in this subtask)**

   Example:

   - `markdownv2.ts` → `export class MarkdownV2 { static escape(text: string): string { ... } }`
   - `url.ts` → `export class UrlUtil { static extractFirstHttpUrl(...); static assertPublicHttpUrl(...); static collectUrlsFromMessage(...); }`

   Use `private static readonly` for module-level constants like `MD_SPECIAL`, `URL_RE`, `BLOCKED` where appropriate to avoid instance state.

2. **Migrate implementations**

   - Move `escapeMarkdownV2` body into `MarkdownV2.escape` without changing algorithm.
   - Move URL helpers into static methods; keep `URL_RE` and `BLOCKED` semantics the same (including private IP regex).

3. **Update imports**

   - `SummaryTextHandler`: replace function imports with class static calls.
   - Parser service class: replace `assertPublicHttpUrl` import with `UrlUtil.assertPublicHttpUrl` (or your class name).

4. Remove old **exported function** names from util modules if unused; ensure no duplicate exports.

5. Run `npm run build`.

## Acceptance criteria

- [ ] Both util modules export exactly one primary utility **class** each (no free-function exports left unless you have a deliberate exception — default: **none**).
- [ ] All previous call sites compile and behave the same.
- [ ] `npm run build` passes; `noUnusedLocals` / `noUnusedParameters` clean.

## Notes / risks

- **Telegram entity typing:** `collectUrlsFromMessage` parameter type should stay as precise as today; do not widen to `any`.
- If any file still imported removed function names, `tsc` will catch it — grep for `escapeMarkdownV2` / `extractFirstHttpUrl` after edits.
- This subtask is the last chance to align naming; avoid renaming again after merge.
