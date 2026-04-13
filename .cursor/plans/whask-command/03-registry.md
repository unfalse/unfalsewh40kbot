# Subtask 03: Register `/whask` in HandlerRegistry

## Plan links
- [Plan overview](./00-overview.md)
- Depends on: [02 — Create `WhaskCommandHandler`](./02-whask-handler.md)
- Next: none

## Objective
Wire `WhaskCommandHandler` into `src/handlers/index.ts` so that the bot responds to the `/whask` command. No other files need to change.

## Context
File: `src/handlers/index.ts`

Current handler registrations (lines 32–47):
```typescript
bot.command("weather", (ctx) => this.weatherHandler.handle(ctx));
bot.command("request", (ctx) => this.requestHandler.handle(ctx));
bot.command("ask", (ctx) => this.askHandler.handle(ctx));
```

## Steps

1. **Add import** at the top of the file, alongside the other handler imports:
```typescript
import { WhaskCommandHandler } from "./whask.handler";
```

2. **Declare private field** inside `HandlerRegistry`, alongside `askHandler`:
```typescript
private readonly whaskHandler: WhaskCommandHandler;
```

3. **Instantiate** in the constructor body, after `this.askHandler = …`:
```typescript
this.whaskHandler = new WhaskCommandHandler({ llm: deps.llm });
```

4. **Register the command** inside `register(bot)`, after the `"ask"` line:
```typescript
bot.command("whask", (ctx) => this.whaskHandler.handle(ctx));
```

## Acceptance criteria
- [ ] `import { WhaskCommandHandler }` is present in `index.ts`.
- [ ] `whaskHandler` field is declared, instantiated, and registered.
- [ ] `bot.command("whask", …)` is called inside `register`.
- [ ] `tsc --noEmit` (or `npm run build`) passes with zero new errors.
- [ ] Sending `/whask как работает варп?` to the bot returns a WH40k-flavoured answer in Russian.

## Notes / risks
- **BotFather**: after deployment, run `/setcommands` in BotFather to add `whask - Задать вопрос Лексмеханику` so the command appears in the Telegram command menu. This is a manual step outside the codebase.
- Registration order: placing `/whask` right after `/ask` keeps the `register` method logically grouped (all LLM-backed commands together, before event listeners).
