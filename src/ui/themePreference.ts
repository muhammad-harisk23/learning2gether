export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "k12learn2gether.theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function readThemePreference(
  storage?: Pick<Storage, "getItem">,
): ThemePreference {
  try {
    const value = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : "light";
  } catch {
    return "light";
  }
}

export function saveThemePreference(
  theme: ThemePreference,
  storage?: Pick<Storage, "getItem" | "setItem">,
): boolean {
  if (!isThemePreference(theme)) return false;

  try {
    const target = storage ?? window.localStorage;
    target.setItem(THEME_STORAGE_KEY, theme);
    return target.getItem(THEME_STORAGE_KEY) === theme;
  } catch {
    return false;
  }
}

export function applyThemePreference(
  theme: ThemePreference,
  root: HTMLElement = document.documentElement,
): void {
  const validTheme = isThemePreference(theme) ? theme : "light";
  root.dataset.theme = validTheme;
  root.ownerDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", validTheme === "dark" ? "#1D201D" : "#FAF9F5");
}
