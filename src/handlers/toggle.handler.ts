import type { Context } from "grammy";
import type { PreferencesService } from "../services/preferences.service";
import { messages, t } from "../config/messages";

export class ToggleCommandHandler {
  private readonly prefs: PreferencesService;

  constructor(deps: { prefs: PreferencesService }) {
    this.prefs = deps.prefs;
  }

  async handle(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const lang = this.prefs.getLanguage(userId);
    const current = this.prefs.getSystemPromptEnabled(userId);
    const next = !current;

    this.prefs.setSystemPromptEnabled(userId, next);

    const msg = next ? messages.handlers.toggle.enabled : messages.handlers.toggle.disabled;
    await ctx.reply(t(msg, lang), { parse_mode: "HTML" });
  }
}
