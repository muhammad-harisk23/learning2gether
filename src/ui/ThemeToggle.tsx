import type { ThemePreference } from "./themePreference";
import { useState } from "react";

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => boolean;
}) {
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  function choose(nextTheme: ThemePreference) {
    setStorageUnavailable(!onChange(nextTheme));
  }

  return <div className="theme-toggle" role="group" aria-label="Color theme">
    <div className="theme-toggle-buttons">
      <button type="button" aria-pressed={theme === "light"} onClick={() => choose("light")}>Light</button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => choose("dark")}>Dark</button>
    </div>
    {storageUnavailable && <span className="theme-save-note" role="status">Theme applies for this visit only; browser storage is unavailable.</span>}
  </div>;
}
