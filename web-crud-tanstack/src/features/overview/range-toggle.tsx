import { cn } from "#/lib/utils";

export const WEEK_RANGES = [
  { label: "12 weeks", weeks: 12 },
  { label: "8 weeks", weeks: 8 },
  { label: "4 weeks", weeks: 4 },
] as const;

/** Small segmented control for a "last N weeks" range. */
export const RangeToggle = ({ value, onChange }: { value: number; onChange: (weeks: number) => void }) => (
  <div className="flex rounded-md border p-0.5 text-xs">
    {WEEK_RANGES.map((r) => (
      <button
        key={r.weeks}
        type="button"
        onClick={() => onChange(r.weeks)}
        className={cn(
          "rounded-sm px-2.5 py-1 font-medium transition-colors",
          value === r.weeks ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {r.label}
      </button>
    ))}
  </div>
);
