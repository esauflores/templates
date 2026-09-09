import { Badge } from "../ui/badge";

type Tone = "green" | "amber" | "red" | "blue" | "gray";

const DOT: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-muted-foreground",
};

export const StatusBadge = ({ label, tone }: { label: string; tone: Tone }) => (
  <Badge variant="outline" className="gap-1.5 capitalize">
    <span className={`size-2 rounded-full ${DOT[tone]}`} />
    {label}
  </Badge>
);
