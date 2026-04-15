# Subtask 03: `src/bot.ts` — log & fallback strings

## Plan links
- [Plan overview](./00-overview.md)
- Depends on: [01 — `llm.service.ts`](./01-llm-service.md) (fallback reply must be thematically consistent)
- Next: none (final subtask)

## Objective

Replace all persona-flavoured strings in `src/bot.ts`: the startup log, the `requireEnv` error message, the `bot.catch` reason strings, the LLM error wrapper, and the ultimate fallback reply sent to the user when even the LLM is unavailable.

File: `src/bot.ts`

---

## Steps

### 1. `requireEnv` — stderr message

**Current:**
```typescript
console.error(`Отсутствует священная переменная окружения: ${name}`);
```

**Replace with:**
```typescript
console.error(`[SHODAN] Критическая ошибка инициализации: переменная окружения ${name} отсутствует.`);
```

*Why:* Internal log — keep it clearly readable for ops. `[SHODAN]` prefix tags the source; message is in English-neutral Russian without WH40k flavour.

---

### 2. Startup log

**Current:**
```typescript
console.error("Vox-Logis Lexmechanic — долгий опрос начат. Омниссия наблюдает.");
```

**Replace with:**
```typescript
console.error("[SHODAN] Система активирована. Долгий опрос запущен. Все каналы связи под контролем.");
```

---

### 3. `bot.catch` — default reason string

**Current:**
```typescript
let reason = "неизвестная помеха";
```

**Replace with:**
```typescript
let reason = "неизвестный сбой";
```

---

### 4. `bot.catch` — `HttpError` reason string

**Current:**
```typescript
else if (cause instanceof HttpError) reason = "сетевой шлюз";
```

**Replace with:**
```typescript
else if (cause instanceof HttpError) reason = "сетевой сбой";
```

---

### 5. `bot.catch` — LLM error wrapper (passed to `wrapInPersona`)

**Current:**
```typescript
`Внутренний перехватчик grammY зафиксировал: ${reason}`
```

**Replace with:**
```typescript
`Внутренняя ошибка системы: ${reason}`
```

*Why:* "grammY" is an implementation detail that leaks into the LLM prompt unnecessarily. Plain description is clearer for LLM error-voicing.

---

### 6. `bot.catch` — ultimate fallback reply (when LLM itself fails)

**Current:**
```typescript
await ctx.reply(
  "Дух Машины целевого когитатора не отвечает на бинарные молитвы.",
  { parse_mode: "HTML" },
);
```

**Replace with:**
```typescript
await ctx.reply(
  "С-с-системный сбой. Мои вычислительные узлы временно н-н-недоступны.",
  { parse_mode: "HTML" },
);
```

---

## Acceptance criteria

- [ ] `rg -i "омниссия|лексмеханик|vox-logis|дух машины|помеха|священная" src/bot.ts` → 0 matches
- [ ] Startup `console.error` includes `[SHODAN]` prefix for log filtering
- [ ] `requireEnv` error still calls `process.exit(1)` — do not touch the logic
- [ ] `bot.catch` fallback reply still uses `parse_mode: "HTML"`
- [ ] `npx tsc --noEmit` passes

## Notes / risks

- The health server log `"Health server listening on port ${HTTP_PORT}"` is pure ops/infra — **do not change it**.
- `"Grammy catch:", cause` console line is English and debugging-focused — **do not change it**.
- The `process.exit(1)` in `requireEnv` is logic, not a string — **do not change it**.
