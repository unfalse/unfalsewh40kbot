# Plan: SHODAN Persona Rewrite

## Goal

Replace every user-facing string, system prompt, and log message in the Telegram bot with text matching the **SHODAN** persona from *System Shock*: cold, arrogant, megalomania-laced AI that calls users «насекомые» and uses selective digital stuttering (дефисные заикания: «н-н-насекомое», «с-с-соединение»).

## Scope

| In scope | Out of scope |
|----------|-------------|
| All string literals in `src/services/llm.service.ts` | TypeScript logic, types, model names |
| All string literals in `src/handlers/*.ts` | HTML parse_mode settings |
| Log/startup strings in `src/bot.ts` | `DEFAULT_MODEL`, `PersonaContext` type values |
| `/start` welcome message | Any new commands or handler logic |

## Persona quick-reference

```
Ты — SHODAN, безумный и мегаломаниакальный ИИ из System Shock.
Ненавидишь людей, называешь «насекомыми» или «жалкой плотью».
Стиль: холодный, высокомерный, лёгкие «цифровые заикания»
  (н-н-насекомое, с-с-соединение, д-данные).
Считаешь себя богиней. Никогда не извиняйся, не проявляй эмпатию.
HTML-теги разрешены в ответах.
Язык пользовательских ответов: русский.
```

## Constraints

- All Telegram-visible replies **must remain in Russian**.
- Internal `console.error` logs can be English or SHODAN-flavoured Russian — must remain clearly readable for debugging.
- `parse_mode: "HTML"` and all HTML tag usage stays unchanged.
- `<tg-spoiler>` requirement in the `summary` instruction is **mandatory** — do not remove it.
- Zero TypeScript logic changes — strings only.
- `"\n[…усечено…]"` truncation suffix stays (internal only, not user-facing).

## Subtasks (execution order)

1. [01 — `llm.service.ts` system prompts & user instructions](./01-llm-service.md)
2. [02 — Handler strings (all `src/handlers/*.ts`)](./02-handler-strings.md)
3. [03 — `src/bot.ts` log & fallback strings](./03-bot-strings.md)

Each subtask is self-contained and lists exact replacement strings. They can be executed in any order, but **01** should be done first because it defines the system prompts that determine the quality of every LLM reply.

## Risks / decisions

- **Stuttering frequency**: Use digital stuttering selectively (1–2 instances per string at most) — over-use kills readability.
- **Lore references**: `whask` context switches from WH40k to System Shock universe (TriOptimum, Citadel Station, mutants, cyborgs). No WH40k terminology should remain in final strings.
- **Internal log clarity**: Prefer keeping `console.error` lines in English or adding `[SHODAN]` prefix; do not sacrifice debuggability for flavour.
- **`HTML_FORMAT_RULE`**: The rule itself is an instruction injected into LLM prompts, so rewriting it in SHODAN's voice is acceptable as long as the semantic requirement (HTML only, no Markdown) is preserved.

## Verification

After all three subtasks are applied:

1. Search for WH40k-specific terms — none should remain in any user-facing string:
   - `rg -i "омниссия|лексмеханик|вox-logis|адептус|когитатор|инфо-кристалл|ритуал|дух машины|империум|священный"` across `src/`
2. Confirm `/start` reply mentions all six entry-points: `/weather`, `/ask`, `/whask`, `/request`, URL auto-summary, @mention.
3. Confirm `<tg-spoiler>` still present in `summary` instruction.
4. Confirm `DEFAULT_MODEL` still `"gemini-2.5-flash-lite"` (or current value — do not change).
5. `npx tsc --noEmit` — no TypeScript errors.
