import { cn } from "#/lib/utils";

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
    className={cn(
      "flex shrink-0 items-center justify-center rounded-md font-semibold text-white select-none",
      className,
    )}
    style={{ backgroundColor: `oklch(0.62 0.15 ${hueOf(email || name || "?")})` }}
  >
    {initialsOf(name, email)}
  </span>
);
