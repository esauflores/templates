/** Light or dark: the theme's colors follow the `.dark` class on <html> (global.css). */
export type Theme = "light" | "dark";

const KEY = "theme";

/** The theme saved by the toggle, or the system's when none is saved (or storage is blocked). */
export function preferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Shows a theme, and saves it when asked (the toggle does; the first paint doesn't). */
export function applyTheme(theme: Theme, { save = false } = {}) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (!save) return;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}
