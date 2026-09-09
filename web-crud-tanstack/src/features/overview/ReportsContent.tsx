import { format } from "date-fns";
import { type PropsWithChildren, useState } from "react";

import { SimpleBars } from "#/components/analytics/simple-bars";
import { StatRow } from "#/components/analytics/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { CUSTOMERS, PLANS } from "#/features/sales/data/customers";
import { ORDER_STATUSES, ORDERS } from "#/features/sales/data/orders";
import { PRIORITIES, TICKETS } from "#/features/support/data/tickets";
import { currency } from "#/lib/format";

import { RangeToggle } from "./range-toggle";
import { weekly } from "./weekly";

function Panel({ title, description, children }: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export const ReportsContent = () => {
  const [weeks, setWeeks] = useState(8);
  const revenue = ORDERS.filter((order) => order.status !== "refunded").reduce((sum, order) => sum + order.total, 0);
  const customers = weekly(CUSTOMERS, (customer) => customer.createdAt, { weeks });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <StatRow
        items={[
          { label: "Customers", value: CUSTOMERS.length },
          { label: "Order revenue", value: currency(revenue), hint: "Excludes refunds" },
          { label: "Orders", value: ORDERS.length },
          { label: "Tickets", value: TICKETS.length },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Weekly customers</h2>
        <RangeToggle value={weeks} onChange={setWeeks} />
      </div>
      <Panel title="New customers" description="Signups per week">
        <SimpleBars
          items={customers.map((item) => ({ label: format(new Date(item.date), "MMM d"), value: item.count }))}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Customers by plan">
          <SimpleBars
            items={PLANS.map((plan) => ({
              label: plan,
              value: CUSTOMERS.filter((customer) => customer.plan === plan).length,
            }))}
          />
        </Panel>
        <Panel title="Orders by status">
          <SimpleBars
            items={ORDER_STATUSES.map((status) => ({
              label: status,
              value: ORDERS.filter((order) => order.status === status).length,
              color: "var(--chart-2)",
            }))}
          />
        </Panel>
        <Panel title="Tickets by priority">
          <SimpleBars
            items={PRIORITIES.map((priority) => ({
              label: priority,
              value: TICKETS.filter((ticket) => ticket.priority === priority).length,
              color: "var(--chart-3)",
            }))}
          />
        </Panel>
      </div>
    </div>
  );
};
