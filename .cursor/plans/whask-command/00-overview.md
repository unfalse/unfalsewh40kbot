# Plan: `/whask` command

## Goal
Add a `/whask` Telegram bot command that answers any user question wrapped in Warhammer 40k lore flavour — like consulting a Lexmechanic of the Adeptus Mechanicus who can't resist colouring every answer with references to the Omnissiah, the Imperium, Chaos, xenos, and the grimdark universe.

## Success criteria
- `/whask <question>` replies in Russian with a factually correct answer that is visibly flavoured with WH40k lore terms/tone.
- The new persona `"whask"` is present in `PersonaContext` and fully wired into the existing `wrapInPersona` machinery.
- No existing commands or handlers are broken.
- TypeScript strict mode produces zero errors (`npm run build` or `tsc --noEmit` passes).

## Scope
**In scope**
- New `"whask"` value in the `PersonaContext` union (`src/services/llm.service.ts`)
- New handler class `WhaskCommandHandler` (`src/handlers/whask.handler.ts`)
- Registration of the `/whask` command in `HandlerRegistry` (`src/handlers/index.ts`)

**Out of scope**
- BotFather `/setcommands` update (manual step; noted in subtask 3)
- Any new npm dependencies
- Changes to existing persona behaviour

## Dependency order

```
[01 — LLM persona](./01-llm-persona.md)
        ↓
[02 — Handler](./02-whask-handler.md)
        ↓
[03 — Registry](./03-registry.md)
```

Each step depends on the previous one compiling cleanly.

## Subtasks

1. [01 — Add `"whask"` persona to LLM service](./01-llm-persona.md)
2. [02 — Create `WhaskCommandHandler`](./02-whask-handler.md)
3. [03 — Register `/whask` in HandlerRegistry](./03-registry.md)

## Risks / decisions
- **Tone balance**: the system prompt must flavour the answer without burying the factual content. Keep lore references as framing, not as the bulk of the reply.
- **Token budget**: WH40k prose is verbose; `1200` tokens is a reasonable ceiling (same order as `plain` at `1024` but slightly more room for flavour). Adjust if responses feel truncated.
- **Temperature**: `0.8` — higher creativity than `plain` (0.5) but lower than `chat` (0.9) to keep answers coherent.
- **Language**: replies must be in Russian; lore terms (Omnissiah, Astartes, Cogitator, etc.) may be left in their common transliterated Russian forms (Омниссия, Астартес, Когитатор) or English depending on bot's established style — the existing `LEX_SYSTEM` already uses Russian lore transliterations, so follow that pattern.
