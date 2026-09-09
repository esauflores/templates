import { format } from "date-fns";
import { useState } from "react";

import { SimpleBars } from "#/components/analytics/simple-bars";
import { StatRow } from "#/components/analytics/stats";
import { DataTable } from "#/components/crud/data-table";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { StatusBadge } from "#/components/ui/status-badge";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { CUSTOMERS } from "#/features/sales/data/customers";
import { INVOICES } from "#/features/sales/data/invoices";
import { PROJECTS } from "#/features/workspace/data/projects";
import { currency, fmtDate } from "#/lib/format";

import { RangeToggle } from "./range-toggle";
import { weekly } from "./weekly";

const INVOICE_TONE = { paid: "green", open: "blue", overdue: "red" } as const;

export const OverviewContent = () => {
  const [weeks, setWeeks] = useState(8);
  const mrr = CUSTOMERS.reduce((sum, customer) => sum + customer.mrr, 0);
  const openTotal = INVOICES.filter((invoice) => invoice.status !== "paid").reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const recent = [...INVOICES].sort((a, b) => +new Date(b.dueDate) - +new Date(a.dueDate)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        items={[
          { label: "Customers", value: CUSTOMERS.length, delta: "+12.5%", trend: "up", takeaway: "Growing this month" },
          { label: "MRR", value: currency(mrr), delta: "+8.2%", trend: "up", takeaway: "Up this month" },
          {
            label: "Outstanding",
            value: currency(openTotal),
            delta: "-4.1%",
            trend: "down",
            takeaway: "Open + overdue",
          },
          {
            label: "Active projects",
            value: PROJECTS.filter((project) => project.status === "active").length,
            delta: "+2",
            trend: "up",
            takeaway: "Two new this week",
          },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle>New customers</CardTitle>
          <CardDescription>Signups per week</CardDescription>
          <CardAction>
            <RangeToggle value={weeks} onChange={setWeeks} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <SimpleBars
            items={weekly(CUSTOMERS, (customer) => customer.createdAt, { weeks }).map((item) => ({
              label: format(new Date(item.date), "MMM d"),
              value: item.count,
            }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={recent}
            empty="No invoices."
            head={
              <>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </>
            }
            render={(invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono">{invoice.number}</TableCell>
                <TableCell className="font-medium">{invoice.customer}</TableCell>
                <TableCell className="text-right tabular-nums">{currency(invoice.amount)}</TableCell>
                <TableCell>
                  <StatusBadge label={invoice.status} tone={INVOICE_TONE[invoice.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(invoice.dueDate)}</TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
