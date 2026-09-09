import { MessageSquare, Pencil, Plus, LogIn, Trash2 } from "lucide-react";
import { useState } from "react";

import { StatRow } from "#/components/crud/stats";
import { Button } from "#/components/ui/button";
import { ACTIVITY, ACTIVITY_KINDS, type ActivityKind } from "#/features/support/data/activity";
import { fmtDate } from "#/lib/format";

const ICON: Record<ActivityKind, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  comment: MessageSquare,
  login: LogIn,
};

const TONE: Record<ActivityKind, string> = {
  created: "text-emerald-600 dark:text-emerald-400",
  updated: "text-blue-600 dark:text-blue-400",
  deleted: "text-red-600 dark:text-red-400",
  comment: "text-muted-foreground",
  login: "text-muted-foreground",
};

const VERB: Record<ActivityKind, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  comment: "commented on",
  login: "",
};

type Filter = ActivityKind | "all";

export const ActivityContent = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = ACTIVITY.filter((e) => filter === "all" || e.kind === filter);

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        items={[
          { label: "Events", value: ACTIVITY.length },
          { label: "Edits", value: ACTIVITY.filter((e) => e.kind === "updated").length },
          { label: "Comments", value: ACTIVITY.filter((e) => e.kind === "comment").length },
          { label: "Sign-ins", value: ACTIVITY.filter((e) => e.kind === "login").length },
        ]}
      />

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...ACTIVITY_KINDS] as Filter[]).map((k) => (
          <Button
            key={k}
            type="button"
            size="xs"
            variant={filter === k ? "default" : "outline"}
            className="capitalize"
            onClick={() => setFilter(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      <ol className="relative flex flex-col gap-5 border-l pl-6">
        {rows.map((e) => {
          const Icon = ICON[e.kind];
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background">
                <Icon className={`size-3.5 ${TONE[e.kind]}`} />
              </span>
              <p className="text-sm">
                <span className="font-medium">{e.actor}</span>{" "}
                {e.kind === "login" ? e.target : `${VERB[e.kind]} ${e.target}`}
              </p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.at)}</p>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-sm text-muted-foreground">No events.</li>}
      </ol>
    </div>
  );
};
