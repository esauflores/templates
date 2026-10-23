/** Light or dark: the theme's colors follow the `.dark` class on <html> (global.css). */
export type Theme = "light" | "dark";

/** Where the toggle saves the choice; index.html reads the same key to set the theme before the first paint. */
const KEY = "theme";

/** The theme saved by the toggle, or the system's when none is saved (or storage is blocked). */
export function preferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Shows a theme and saves it, for the next visit. */
export function saveTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}
