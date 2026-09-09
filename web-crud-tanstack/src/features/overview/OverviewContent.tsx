import { useState } from "react";

import { Area } from "#/components/charts/area";
import { AreaChart } from "#/components/charts/area-chart";
import { Grid } from "#/components/charts/grid";
import { XAxis } from "#/components/charts/x-axis";
import { DataTable } from "#/components/crud/data-table";
import { StatRow } from "#/components/crud/stats";
import { StatusBadge } from "#/components/crud/status-badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
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

  const mrr = CUSTOMERS.reduce((s, c) => s + c.mrr, 0);
  const openTotal = INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const activeProjects = PROJECTS.filter((p) => p.status === "active").length;
  const chartData = weekly(CUSTOMERS, (c) => c.createdAt, { weeks });
  const recent = [...INVOICES].sort((a, b) => +new Date(b.dueDate) - +new Date(a.dueDate)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        items={[
          {
            label: "Customers",
            value: CUSTOMERS.length,
            delta: "+12.5%",
            trend: "up",
            takeaway: "Growing this month",
            hint: "vs. previous 30 days",
          },
          {
            label: "MRR",
            value: currency(mrr),
            delta: "+8.2%",
            trend: "up",
            takeaway: "Up this month",
            hint: "recurring revenue",
          },
          {
            label: "Outstanding",
            value: currency(openTotal),
            delta: "-4.1%",
            trend: "down",
            takeaway: "Down this period",
            hint: "open + overdue",
          },
          {
            label: "Active projects",
            value: activeProjects,
            delta: "+2",
            trend: "up",
            takeaway: "Two new this week",
            hint: `of ${PROJECTS.length} total`,
          },
        ]}
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>New customers</CardTitle>
          <CardDescription>Signups per week</CardDescription>
          <CardAction>
            <RangeToggle value={weeks} onChange={setWeeks} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={chartData}
            xDataKey="date"
            aspectRatio="3 / 1"
            margin={{ top: 12, right: 8, bottom: 28, left: 8 }}
          >
            <Grid />
            <XAxis numTicks={4} />
            <Area dataKey="count" fillOpacity={0.4} />
          </AreaChart>
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
            render={(inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono">{inv.number}</TableCell>
                <TableCell className="font-medium">{inv.customer}</TableCell>
                <TableCell className="text-right tabular-nums">{currency(inv.amount)}</TableCell>
                <TableCell>
                  <StatusBadge label={inv.status} tone={INVOICE_TONE[inv.status]} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
