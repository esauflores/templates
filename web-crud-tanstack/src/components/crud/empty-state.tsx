import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

/** Friendly empty state for `DataGrid`'s `empty` prop — icon, message, optional CTA. */
export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 py-8 text-center">
    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Inbox className="size-5" />
    </span>
    <p className="text-sm text-muted-foreground">{message}</p>
    {action}
  </div>
);
