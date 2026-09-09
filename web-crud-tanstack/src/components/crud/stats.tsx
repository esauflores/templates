import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export type Stat = {
  label: string;
  value: string | number;
  /** Trend chip, top-right, e.g. "+12.5%". */
  delta?: string;
  /** Arrow direction for the chip + takeaway. Default: "up". */
  trend?: "up" | "down";
  /** Bold context line under the value. */
  takeaway?: string;
  /** Muted context line under the value. */
  hint?: string;
};

export const StatRow = ({ items }: { items: Stat[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((s) => {
      const Arrow = s.trend === "down" ? TrendingDown : TrendingUp;
      return (
        <Card key={s.label} className="gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            {s.delta ? (
              <Badge variant="outline" className="gap-1 px-1.5 text-xs font-normal">
                <Arrow className="size-3" />
                {s.delta}
              </Badge>
            ) : null}
          </div>
          <span className="text-2xl font-semibold tabular-nums">{s.value}</span>
          {s.takeaway || s.hint ? (
            <div className="flex flex-col gap-0.5 text-xs">
              {s.takeaway ? (
                <span className="flex items-center gap-1 font-medium">
                  {s.takeaway}
                  <Arrow className="size-3.5" />
                </span>
              ) : null}
              {s.hint ? <span className="text-muted-foreground">{s.hint}</span> : null}
            </div>
          ) : null}
        </Card>
      );
    })}
  </div>
);
