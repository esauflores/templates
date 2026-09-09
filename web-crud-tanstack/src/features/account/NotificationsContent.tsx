import { AtSign, Bell, CreditCard, MessageSquare, UserPlus } from "lucide-react";
import { useState } from "react";

import { StatRow } from "#/components/analytics/stats";
import { Button } from "#/components/ui/button";
import { NOTIFICATION_KINDS, NOTIFICATIONS, type NotificationKind } from "#/features/account/data/notifications";
import { fromNow } from "#/lib/format";
import { cn } from "#/lib/utils";

const ICON: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  assigned: UserPlus,
  comment: MessageSquare,
  billing: CreditCard,
  system: Bell,
};

type Filter = NotificationKind | "all" | "unread";

export const NotificationsContent = () => {
  const [items, setItems] = useState(NOTIFICATIONS);
  const [filter, setFilter] = useState<Filter>("all");

  const unread = items.filter((n) => !n.read).length;
  const rows = items.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read : n.kind === filter));

  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggle = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        items={[
          { label: "All", value: items.length },
          { label: "Unread", value: unread },
          { label: "Mentions", value: items.filter((n) => n.kind === "mention").length },
          { label: "Billing", value: items.filter((n) => n.kind === "billing").length },
        ]}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "unread", ...NOTIFICATION_KINDS] as Filter[]).map((k) => (
          <Button
            key={k}
            size="xs"
            variant={filter === k ? "default" : "outline"}
            className="capitalize"
            onClick={() => setFilter(k)}
          >
            {k}
          </Button>
        ))}
        <Button size="xs" variant="ghost" className="ml-auto" disabled={unread === 0} onClick={markAll}>
          Mark all read
        </Button>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {rows.map((n) => {
          const Icon = ICON[n.kind];
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => toggle(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 p-4 text-left hover:bg-accent/50",
                  !n.read && "bg-accent/30",
                )}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {n.title}
                    {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
                  </span>
                  <span className="text-sm text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">{fromNow(n.at)}</span>
                </span>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">Nothing here.</li>}
      </ul>
    </div>
  );
};
