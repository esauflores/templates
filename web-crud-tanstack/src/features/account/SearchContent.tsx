import { Link } from "@tanstack/react-router";

import { TEAM } from "#/features/admin/data/team";
import { CUSTOMERS } from "#/features/sales/data/customers";
import { INVOICES } from "#/features/sales/data/invoices";
import { ORDERS } from "#/features/sales/data/orders";
import { TICKETS } from "#/features/support/data/tickets";
import { FILES } from "#/features/workspace/data/files";
import { PROJECTS } from "#/features/workspace/data/projects";

const PAGES = [
  "Overview",
  "Projects",
  "Board",
  "Calendar",
  "Files",
  "Customers",
  "Orders",
  "Invoices",
  "Products",
  "Tickets",
  "Activity",
  "Reports",
  "Team",
  "Roles",
  "Billing",
  "Account",
  "Notifications",
  "Integrations",
  "Settings",
];

type Hit = { key: string; label: string; sub: string; to: string; params?: Record<string, string> };

const build = (q: string): { group: string; hits: Hit[] }[] => {
  const m = (s: string) => s.toLowerCase().includes(q);
  return [
    {
      group: "Pages",
      hits: PAGES.filter((p) => m(p)).map((p) => ({
        key: `page-${p}`,
        label: p,
        sub: "Page",
        to: p === "Overview" ? "/" : `/${p.toLowerCase()}`,
      })),
    },
    {
      group: "Customers",
      hits: CUSTOMERS.filter((c) => m(c.name) || m(c.email) || m(c.department)).map((c) => ({
        key: c.id,
        label: c.name,
        sub: `${c.email} · ${c.department}`,
        to: "/customers/$id",
        params: { id: c.id },
      })),
    },
    {
      group: "Projects",
      hits: PROJECTS.filter((p) => m(p.name)).map((p) => ({
        key: p.id,
        label: p.name,
        sub: p.status,
        to: "/projects",
      })),
    },
    {
      group: "Orders",
      hits: ORDERS.filter((o) => m(o.ref) || m(o.customer)).map((o) => ({
        key: o.id,
        label: o.ref,
        sub: o.customer,
        to: "/orders",
      })),
    },
    {
      group: "Invoices",
      hits: INVOICES.filter((i) => m(i.number) || m(i.customer)).map((i) => ({
        key: i.id,
        label: i.number,
        sub: i.customer,
        to: "/invoices",
      })),
    },
    {
      group: "Tickets",
      hits: TICKETS.filter((t) => m(t.subject) || m(t.requester)).map((t) => ({
        key: t.id,
        label: t.subject,
        sub: t.requester,
        to: "/tickets",
      })),
    },
    {
      group: "Team",
      hits: TEAM.filter((t) => m(t.name) || m(t.email)).map((t) => ({
        key: t.id,
        label: t.name,
        sub: t.role,
        to: "/team",
      })),
    },
    {
      group: "Files",
      hits: FILES.filter((f) => m(f.name)).map((f) => ({ key: f.id, label: f.name, sub: f.kind, to: "/files" })),
    },
  ].filter((g) => g.hits.length > 0);
};

export const SearchContent = ({ q }: { q: string }) => {
  const query = q.trim().toLowerCase();
  const groups = query ? build(query) : [];
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {query ? (
          <>
            {total} result{total === 1 ? "" : "s"} for <span className="font-medium text-foreground">“{q}”</span>
          </>
        ) : (
          "Type a query — try “acme”, “invoice” or “ticket”."
        )}
      </p>

      {groups.map((g) => (
        <section key={g.group} className="flex flex-col gap-1">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.group}</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {g.hits.map((h) => (
              <li key={h.key}>
                {/* dynamic string targets — cast past the typed-router Link */}
                <Link
                  to={h.to as never}
                  params={h.params as never}
                  className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-accent/50"
                >
                  <span className="font-medium">{h.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{h.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {query && total === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
    </div>
  );
};
