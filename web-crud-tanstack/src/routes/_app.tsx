import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { AppSidebar } from "#/components/app-sidebar";
import { CommandMenu } from "#/components/command-menu";
import { NotificationBell } from "#/components/notification-bell";
import { Separator } from "#/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { useSession } from "#/lib/auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/board": "Board",
  "/calendar": "Calendar",
  "/files": "Files",
  "/customers": "Customers",
  "/orders": "Orders",
  "/invoices": "Invoices",
  "/products": "Products",
  "/tickets": "Tickets",
  "/activity": "Activity",
  "/reports": "Reports",
  "/assistant": "Assistant",
  "/prompts": "Prompts",
  "/ai-settings": "AI settings",
  "/team": "Team",
  "/roles": "Roles",
  "/integrations": "Integrations",
  "/notifications": "Notifications",
  "/search": "Search",
  "/account": "Account",
  "/billing": "Billing",
  "/changelog": "Changelog",
  "/getting-started": "Getting started",
  "/settings": "Settings",
};

function AppLayout() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? (pathname.startsWith("/customers/") ? "Customer" : "");

  // Client-side auth gate. The mock session lives in localStorage, so this can't
  // run in `beforeLoad` (SSR always sees "signed out"). The shell renders for
  // everyone (no SSR/hydration mismatch); a logged-out visitor is redirected on
  // the next tick. `useSession` lags a render behind hydration — the 0ms timer +
  // cleanup absorbs that so authed users never bounce.
  const { data: session } = useSession();
  const navigate = useNavigate();
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (session || pathname.startsWith("/sign-in")) return;
    redirectTimer.current = setTimeout(() => {
      navigate({ to: "/sign-in", search: { redirect: pathname }, replace: true });
    }, 0);
    return () => clearTimeout(redirectTimer.current);
  }, [session, pathname, navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <span className="text-base font-semibold">{title}</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("command-menu:open"))}
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded bg-muted px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
