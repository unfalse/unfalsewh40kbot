# Subtask 01: Add `"whask"` persona to LLM service

## Plan links
- [Plan overview](./00-overview.md)
- Depends on: none
- Next: [02 — Create `WhaskCommandHandler`](./02-whask-handler.md)

## Objective
Extend `src/services/llm.service.ts` so that `"whask"` is a valid `PersonaContext` value with its own system prompt, temperature, token limit, and user instruction. Zero TypeScript errors after the change.

## Context
File: `src/services/llm.service.ts`

Key structures to update (all are `Record<PersonaContext, …>` maps — adding a new union member causes a compile error until every map is updated):

| Symbol | Change |
|--------|--------|
| `PersonaContext` (type alias, line 3) | Add `\| "whask"` |
| `TOKENS` record (line 22) | Add `whask: 1200` |
| `TEMPERATURE` record (line 30) | Add `whask: 0.8` |
| `SYSTEM_PROMPT` record (line 38) | Add `whask: WHASK_SYSTEM` (new constant) |
| `userInstructionFor` switch (line 46) | Add `case "whask":` branch |

## Steps

1. **Define the system prompt constant** — add directly above `PLAIN_SYSTEM` (or alongside other system constants near the top of the file):

```typescript
const WHASK_SYSTEM =
  "Ты — Лексмеханик Адептус Механикус, хранитель сакральных знаний Империума. " +
  "Когда смертный задаёт тебе вопрос, ты отвечаешь на него полно и по существу — " +
  "но неизменно облекаешь ответ в язык Империума: упоминаешь Омниссию, Императора, " +
  "угрозы Хаоса или ксеносов там, где это уместно. " +
  "Ты можешь сослаться на когитаторы, свитки Адептус Механикус, Астартес, Инквизицию или " +
  "другие элементы вселенной Warhammer 40 000 как на метафору или источник примера. " +
  "Отвечай на русском языке. Форматируй ответ так, чтобы он хорошо читался в Telegram. " +
  "Никогда не выходи из роли.";
```

2. **Add `"whask"` to the `PersonaContext` union**:
```typescript
export type PersonaContext = "weather" | "summary" | "error" | "chat" | "plain" | "whask";
```

3. **Add entry to `TOKENS`**:
```typescript
whask: 1200,
```

4. **Add entry to `TEMPERATURE`**:
```typescript
whask: 0.8,
```

5. **Add entry to `SYSTEM_PROMPT`**:
```typescript
whask: WHASK_SYSTEM,
```

6. **Add `case "whask":` to `userInstructionFor`** — place it before the `case "plain":` branch:
```typescript
case "whask":
  return (
    "Смертный задал тебе вопрос. Ответь на него полно и точно, " +
    "но неизменно через призму лора Warhammer 40 000: " +
    "используй терминологию Империума, упоминай угрозы Хаоса, ксеносов или благость Омниссии " +
    "там, где это органично. Вопрос пользователя:"
  );
```

## Acceptance criteria
- [ ] `PersonaContext` includes `"whask"`.
- [ ] All four `Record<PersonaContext, …>` maps have a `whask` entry.
- [ ] `userInstructionFor("whask")` returns a non-empty string.
- [ ] `tsc --noEmit` (or `npm run build`) passes with no new errors.

## Notes / risks
- TypeScript exhaustiveness: if `userInstructionFor` ever becomes exhaustive-checked, the missing case would be a compile error — adding the `case` block prevents that.
- The `WHASK_SYSTEM` constant name must not clash with existing names (`LEX_SYSTEM`, `PLAIN_SYSTEM`).
