import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { NOTIFICATIONS } from "#/features/account/data/notifications";
import { fromNow } from "#/lib/format";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const recent = NOTIFICATIONS.slice(0, 5);
const unread = NOTIFICATIONS.filter((n) => !n.read).length;

export const NotificationBell = () => (
  <DropdownMenu>
    <DropdownMenuTrigger className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground">
          {unread}
        </span>
      )}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">
      <DropdownMenuLabel className="flex items-center justify-between">
        Notifications
        <span className="text-xs font-normal text-muted-foreground">{unread} unread</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {recent.map((n) => (
        <DropdownMenuItem key={n.id} asChild>
          <Link to="/notifications" className="flex flex-col items-start gap-0.5">
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
              <span className="truncate">{n.title}</span>
            </span>
            <span className="truncate text-xs text-muted-foreground">{fromNow(n.at)}</span>
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/notifications" className="justify-center text-sm">
          View all
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
