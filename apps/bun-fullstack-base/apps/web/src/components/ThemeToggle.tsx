import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { applyTheme, preferredTheme } from "@web/lib/theme.ts";

/** Switches between light and dark, and remembers the choice. */
export function ThemeToggle() {
  const [theme, setTheme] = useState(preferredTheme);
  const next = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    applyTheme(next, { save: true });
    setTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={`Use the ${next} theme`}
      onClick={toggle}
      className="grid size-11 cursor-pointer place-items-center rounded-lg border border-edge text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
