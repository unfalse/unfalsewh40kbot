import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type Language = "ru" | "en";

interface UserPrefs {
  language: Language;
  systemPromptEnabled?: boolean;
}

type Store = Record<string, UserPrefs>;

export class PreferencesService {
  private readonly filePath: string;
  private store: Store;

  constructor(dataDir = process.env["DATA_DIR"] ?? join(process.cwd(), "data")) {
    mkdirSync(dataDir, { recursive: true });
    this.filePath = join(dataDir, "preferences.json");
    this.store = existsSync(this.filePath)
      ? (JSON.parse(readFileSync(this.filePath, "utf-8")) as Store)
      : {};
  }

  getLanguage(userId: number): Language {
    return this.store[String(userId)]?.language ?? "ru";
  }

  setLanguage(userId: number, lang: Language): void {
    this.store[String(userId)] = { ...this.store[String(userId)], language: lang };
    writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
  }

  getSystemPromptEnabled(userId: number): boolean {
    const stored = this.store[String(userId)]?.systemPromptEnabled;
    return stored ?? (process.env["SYSTEM_PROMPT_ENABLED"] !== "false");
  }

  setSystemPromptEnabled(userId: number, enabled: boolean): void {
    this.store[String(userId)] = { ...this.store[String(userId)], systemPromptEnabled: enabled };
    writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
  }
}
