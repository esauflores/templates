import * as stylex from "@stylexjs/stylex";

import { cn } from "#/lib/utils";

const styles = stylex.create({
  avatar: {
    alignItems: "center",
    borderRadius: 6,
    color: "white",
    display: "flex",
    flexShrink: 0,
    fontWeight: 600,
    justifyContent: "center",
    userSelect: "none",
  },
});

/** Deterministic hue (0–360) from a string — same input, same colour, no network. */
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

const initialsOf = (name: string, email: string) => {
  const n = name.trim();
  if (n && n !== email) {
    const [a, b] = n.split(/\s+/);
    return ((a?.[0] ?? "") + (b?.[0] ?? "")).toUpperCase() || "?";
  }
  return (email.split("@")[0]?.slice(0, 2) || "?").toUpperCase();
};

/** Initials on a colour derived from the identity — swap for a real image/gravatar later. */
export const UserAvatar = ({
  name = "",
  email = "",
  className,
}: {
  name?: string;
  email?: string;
  className?: string;
}) => (
  <span
    aria-hidden
    {...stylex.props(styles.avatar)}
    className={cn(stylex.props(styles.avatar).className, className)}
    style={{ backgroundColor: `oklch(0.62 0.15 ${hueOf(email || name || "?")})` }}
  >
    {initialsOf(name, email)}
  </span>
);
