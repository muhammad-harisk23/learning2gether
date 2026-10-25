import { describe, expect, it } from "vitest";
import { readThemePreference, saveThemePreference, THEME_STORAGE_KEY } from "../../src/ui/themePreference";

function memoryStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    entries,
  };
}

describe("browser-local theme preference", () => {
  it("defaults to Light and accepts only the two supported values", () => {
    const storage = memoryStorage();
    expect(readThemePreference(storage)).toBe("light");
    storage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readThemePreference(storage)).toBe("dark");
    storage.setItem(THEME_STORAGE_KEY, "system");
    expect(readThemePreference(storage)).toBe("light");
  });

  it("persists only its dedicated key and leaves learning data untouched", () => {
    const storage = memoryStorage({
      "k12learn2gether.commitment": "existing commitment bytes",
    });

    expect(saveThemePreference("dark", storage)).toBe(true);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(storage.getItem("k12learn2gether.commitment")).toBe("existing commitment bytes");
    expect([...storage.entries.keys()]).toEqual([
      "k12learn2gether.commitment",
      THEME_STORAGE_KEY,
    ]);
  });

  it("falls back when storage is unavailable and reports an unconfirmed write", () => {
    const unavailable = {
      getItem: () => { throw new Error("storage blocked"); },
      setItem: () => { throw new Error("storage blocked"); },
    };

    expect(readThemePreference(unavailable)).toBe("light");
    expect(saveThemePreference("dark", unavailable)).toBe(false);
  });

  it("does not confirm a write when read-back returns a different value", () => {
    const storage = {
      getItem: () => "light",
      setItem: () => undefined,
    };

    expect(saveThemePreference("dark", storage)).toBe(false);
  });
});
