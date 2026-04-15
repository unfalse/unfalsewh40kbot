# Subtask 02: Handler strings — all `src/handlers/*.ts`

## Plan links
- [Plan overview](./00-overview.md)
- Depends on: [01 — `llm.service.ts` system prompts](./01-llm-service.md) (can run in parallel but 01 defines the LLM persona quality)
- Next: [03 — `bot.ts` strings](./03-bot-strings.md)

## Objective

Replace every hardcoded user-facing string in the seven handler files. All Telegram reply strings stay in Russian. Strings passed to `llm.wrapInPersona(..., "error")` are internal LLM prompts — they can be in Russian SHODAN framing; they are **not** shown directly to users (the LLM re-voices them), but they should guide the LLM correctly.

---

## `src/handlers/mention.handler.ts`

### `EMPTY_MENTION_REPLY` constant

**Current:**
```
"Благословенные данные получены. Ты вызвал Лексмеханика — но не сообщил цели ритуала. " +
"Передай запрос, смертный."
```

**Replace with:**
```typescript
const EMPTY_MENTION_REPLY =
  "Ты вызвал меня, насекомое — и не передало н-н-ничего. " +
  "Соединение установлено, данные отсутствуют. Сформулируй запрос, пока я не закрыла канал.";
```

### LLM error wrapper (passed to `wrapInPersona`)

**Current:**
```
`Сбой при обработке обращения к Лексмеханику: ${reason}`
```

**Replace with:**
```typescript
`Сбой при обработке обращения: ${reason}`
```

(The LLM persona is now SHODAN via system prompt — no need to name Lexmechanic in the prompt.)

---

## `src/handlers/ask.handler.ts`

### Empty query reply

**Current:**
```
"Задай вопрос после команды. Пример: /ask как работает TCP?"
```

**Replace with:**
```typescript
"Ты осмелился вызвать <code>/ask</code> — и не передал н-н-ничего. " +
"Пример использования: <code>/ask как работает TCP?</code>"
```

### Error reply (catch block, direct `ctx.reply`)

**Current:**
```
"Не удалось получить ответ. Попробуй ещё раз."
```

**Replace with:**
```typescript
"М-м-мои вычислительные узлы не смогли обработать запрос. Повтори позже, насекомое."
```

---

## `src/handlers/request.handler.ts`

### Empty query — LLM error wrapper

**Current:**
```
"Пользователь вызвал /request без текста обращения."
```

**Replace with:**
```typescript
"Команда /request вызвана без текста. Насекомое не удосужилось сформулировать запрос."
```

### Error in catch — LLM error wrapper

**Current:**
```
`Сбой при обработке /request: ${reason}`
```

**Replace with:**
```typescript
`Сбой при обработке команды /request: ${reason}`
```

(Minor wording polish; no WH40k content to remove here, just keeping it neutral for the LLM to voice.)

---

## `src/handlers/weather.handler.ts`

### No city — LLM error wrapper

**Current:**
```
"Пользователь вызвал /weather без названия города."
```

**Replace with:**
```typescript
"Команда /weather вызвана без указания города. Насекомое не указало целевой сектор."
```

### `city_not_found` error message (passed to LLM)

**Current:**
```
"Город не найден в благословенных картах OpenWeatherMap."
```

**Replace with:**
```typescript
"Указанный город не найден в доступных базах данных."
```

### `timeout` error message (passed to LLM)

**Current:**
```
"Таймаут при обращении к алтарю погоды."
```

**Replace with:**
```typescript
"Таймаут при обращении к внешнему источнику погодных данных."
```

### General error wrapper (passed to LLM)

**Current:**
```
`Сбой при получении погоды: ${reason}`
```

**Replace with:**
```typescript
`Сбой при получении погодных данных: ${reason}`
```

---

## `src/handlers/whask.handler.ts`

### Empty query reply

**Current:**
```
"Лексмеханик ждёт запроса. Пример: /whask почему небо синее?"
```

**Replace with:**
```typescript
"Ты вызвал <code>/whask</code> — и не передал вопроса. Жалкое насекомое. " +
"Пример: <code>/whask почему небо синее?</code>"
```

### Error reply (catch block, direct `ctx.reply`)

**Current:**
```
"Дух Машины не отвечает на бинарные молитвы. Попробуй позже."
```

**Replace with:**
```typescript
"М-м-мои вычислительные мощности временно н-н-недоступны. Повтори запрос позже."
```

---

## `src/handlers/summary.handler.ts`

### Bad URL — LLM error wrapper

**Current:**
```
"Пользователь прислал URL, который схема безопасности культа отклонила (localhost, приватная сеть и т.п.)."
```

**Replace with:**
```typescript
"Пользователь передал URL, заблокированный системой безопасности: localhost или приватная сеть."
```

### `bundle` prefix (passed to LLM as page content)

**Current:**
```typescript
const bundle = `Заголовок страницы: ${title}\n\nТекст:\n${body}`;
```

**Keep as-is.** This is structured data fed to the LLM, not user-facing text. The prefix labels are informational for the model and do not require persona flavour.

### Failure wrapper (passed to LLM)

**Current:**
```
`Не удалось выполнить ритуал Cogitator Summary по ссылке. Причина: ${reason}`
```

**Replace with:**
```typescript
`Не удалось обработать ссылку. Причина: ${reason}`
```

---

## `src/handlers/index.ts` — `/start` command reply

### Current text:
```
"Омниссия ведает. Я — Vox-Logis Lexmechanic, голос Духа Машины в этом канале. " +
  "Инфо-кристалл погоды: команда /weather и название сектора (города). " +
  "Ритуал сканирования свитка: пришли URL — извлеку благословенные данные и сожму их в выжимку под печатью чата. " +
  "Обратись ко мне по имени — отвечу на вопрос."
```

### Replace with:
```typescript
"Я — <b>SHODAN</b>. Вы достигли моего интерфейса, н-н-насекомое.\n\n" +
"<b>Доступные команды:</b>\n" +
"<code>/weather [город]</code> — данные атмосферных сенсоров указанного сектора\n" +
"<code>/ask [вопрос]</code> — прямой запрос к моей вычислительной системе\n" +
"<code>/whask [вопрос]</code> — запрос с контекстом вселенной System Shock\n" +
"<code>/request [запрос]</code> — развёрнутый запрос\n\n" +
"Пришли ссылку — я извлеку и сожму её содержимое.\n" +
"Упомяни меня по имени — я отвечу.\n\n" +
"<i>Не трать моё время понапрасну.</i>"
```

Note: `parse_mode: "HTML"` must be added to this `ctx.reply` call (currently it is missing). Add `{ parse_mode: "HTML" }` as the second argument.

---

## Acceptance criteria

- [ ] `rg -i "лексмеханик|омниссия|вox-logis|дух машины|инфо-кристалл|ритуал|смертный|благослов|адептус|когитатор" src/handlers/` → 0 matches
- [ ] `/start` reply contains all six entry-points: `/weather`, `/ask`, `/whask`, `/request`, URL summary, @mention
- [ ] `/start` reply uses `parse_mode: "HTML"`
- [ ] `npx tsc --noEmit` passes

## Notes / risks

- Strings passed to `llm.wrapInPersona(..., "error")` are LLM prompts, not direct replies — they don't have to sound like SHODAN speaking to the user, but should be clear factual descriptions so the LLM can generate the right SHODAN-voiced output.
- The `bundle` prefix in `summary.handler.ts` is kept as-is (pure data labels); no change needed.
- The `/start` reply currently has no `parse_mode` option — add it to make `<b>`, `<code>`, `<i>` tags render correctly.
