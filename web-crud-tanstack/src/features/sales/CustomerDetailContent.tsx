import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DataTable } from "#/components/crud/data-table";
import { StatRow } from "#/components/crud/stats";
import { StatusBadge } from "#/components/crud/status-badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { UserAvatar } from "#/components/user-avatar";
import { CUSTOMERS } from "#/features/sales/data/customers";
import { INVOICES } from "#/features/sales/data/invoices";
import { ORDERS } from "#/features/sales/data/orders";
import { TICKETS } from "#/features/support/data/tickets";
import { currency, fmtDate } from "#/lib/format";

const ORDER_TONE = { pending: "amber", paid: "green", shipped: "blue", refunded: "red" } as const;
const INVOICE_TONE = { paid: "green", open: "blue", overdue: "red" } as const;
const TICKET_TONE = { open: "green", pending: "amber", closed: "gray" } as const;
const PLAN_TONE = { free: "gray", pro: "blue", enterprise: "green" } as const;

export const CustomerDetailContent = ({ customerId }: { customerId: string }) => {
  const customer = CUSTOMERS.find((c) => c.id === customerId);

  if (!customer) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/customers">
            <ArrowLeft /> Back to customers
          </Link>
        </Button>
      </div>
    );
  }

  const orders = ORDERS.filter((o) => o.customer === customer.name);
  const invoices = INVOICES.filter((i) => i.customer === customer.name);
  const tickets = TICKETS.filter((t) => t.requester === customer.name);
  const lifetime = orders.filter((o) => o.status !== "refunded").reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={customer.name} email={customer.email} className="size-10 text-sm" />
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {customer.name}
              <StatusBadge label={customer.plan} tone={PLAN_TONE[customer.plan]} />
            </h2>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/customers">
            <ArrowLeft /> Customers
          </Link>
        </Button>
      </div>

      <StatRow
        items={[
          { label: "MRR", value: currency(customer.mrr) },
          { label: "Lifetime orders", value: currency(lifetime), hint: `${orders.length} orders` },
          { label: "Open invoices", value: invoices.filter((i) => i.status !== "paid").length },
          { label: "Open tickets", value: tickets.filter((t) => t.status !== "closed").length },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={orders}
            empty="No orders for this customer."
            head={
              <>
                <TableHead>Ref</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </>
            }
            render={(o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">{o.ref}</TableCell>
                <TableCell className="text-right tabular-nums">{currency(o.total)}</TableCell>
                <TableCell>
                  <StatusBadge label={o.status} tone={ORDER_TONE[o.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(o.placedAt)}</TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={invoices}
            empty="No invoices for this customer."
            head={
              <>
                <TableHead>Number</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </>
            }
            render={(i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono">{i.number}</TableCell>
                <TableCell className="text-right tabular-nums">{currency(i.amount)}</TableCell>
                <TableCell>
                  <StatusBadge label={i.status} tone={INVOICE_TONE[i.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(i.dueDate)}</TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={tickets}
            empty="No tickets from this customer."
            head={
              <>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
              </>
            }
            render={(t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.subject}</TableCell>
                <TableCell>
                  <StatusBadge label={t.status} tone={TICKET_TONE[t.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(t.openedAt)}</TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
