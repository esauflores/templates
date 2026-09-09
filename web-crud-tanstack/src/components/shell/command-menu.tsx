import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CUSTOMERS } from "#/features/sales/data/customers";
import { cn } from "#/lib/utils";

import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

type Target = { label: string; hint: string; to: string; params?: Record<string, string> };

const ROUTES: Target[] = [
  { label: "Overview", hint: "Page", to: "/" },
  { label: "Projects", hint: "Page", to: "/projects" },
  { label: "Files", hint: "Page", to: "/files" },
  { label: "Board", hint: "Page", to: "/board" },
  { label: "Calendar", hint: "Page", to: "/calendar" },
  { label: "Customers", hint: "Page", to: "/customers" },
  { label: "Orders", hint: "Page", to: "/orders" },
  { label: "Invoices", hint: "Page", to: "/invoices" },
  { label: "Products", hint: "Page", to: "/products" },
  { label: "Tickets", hint: "Page", to: "/tickets" },
  { label: "Activity", hint: "Page", to: "/activity" },
  { label: "Reports", hint: "Page", to: "/reports" },
  { label: "Assistant", hint: "Page", to: "/assistant" },
  { label: "Prompts", hint: "Page", to: "/prompts" },
  { label: "AI settings", hint: "Page", to: "/ai-settings" },
  { label: "Team", hint: "Page", to: "/team" },
  { label: "Roles & permissions", hint: "Page", to: "/roles" },
  { label: "Integrations", hint: "Page", to: "/integrations" },
  { label: "Notifications", hint: "Page", to: "/notifications" },
  { label: "Account", hint: "Page", to: "/account" },
  { label: "Billing", hint: "Page", to: "/billing" },
  { label: "Changelog", hint: "Page", to: "/changelog" },
  { label: "Settings", hint: "Page", to: "/settings" },
];

const CUSTOMER_TARGETS: Target[] = CUSTOMERS.map((c) => ({
  label: c.name,
  hint: "Customer",
  to: "/customers/$id",
  params: { id: c.id },
}));

const ALL = [...ROUTES, ...CUSTOMER_TARGETS];

export const CommandMenu = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-menu:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-menu:open", onOpen);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? ALL.filter((t) => `${t.label} ${t.hint}`.toLowerCase().includes(q)) : ROUTES;
    return matches.slice(0, 8);
  }, [query]);

  const go = (t: Target | undefined) => {
    if (!t) return;
    setOpen(false);
    setQuery("");
    setActive(0);
    navigate({ to: t.to, params: t.params });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <DialogContent className="top-24 max-w-lg translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Jump to a page or customer…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>}
          {results.map((t, i) => (
            <button
              key={`${t.to}-${t.params?.id ?? t.label}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(t)}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm",
                i === active && "bg-accent text-accent-foreground",
              )}
            >
              {t.label}
              <span className="text-xs text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
