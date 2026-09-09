import { geoMercator, geoPath } from "d3-geo";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Area } from "#/components/charts/area";
import { AreaChart } from "#/components/charts/area-chart";
import { Bar } from "#/components/charts/bar";
import { BarChart } from "#/components/charts/bar-chart";
import { BarXAxis } from "#/components/charts/bar-x-axis";
import { ChoroplethChart, ChoroplethFeatureComponent, ChoroplethTooltip } from "#/components/charts/choropleth";
import { Grid } from "#/components/charts/grid";
import { Line } from "#/components/charts/line";
import { LineChart } from "#/components/charts/line-chart";
import { PieChart } from "#/components/charts/pie-chart";
import { PieSlice } from "#/components/charts/pie-slice";
import { XAxis } from "#/components/charts/x-axis";
import { YAxis } from "#/components/charts/y-axis";
import { StatRow } from "#/components/crud/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { CUSTOMERS, type Plan, PLANS } from "#/features/sales/data/customers";
import { ORDER_STATUSES, ORDERS } from "#/features/sales/data/orders";
import { SV_DEPARTMENTS } from "#/features/sales/data/sv-departments";
import { PRIORITIES, TICKETS } from "#/features/support/data/tickets";
import { currency } from "#/lib/format";

import { RangeToggle } from "./range-toggle";
import { weekly } from "./weekly";

const PLAN_COLOR: Record<Plan, string> = {
  free: "var(--color-muted-foreground)",
  pro: "var(--color-blue-500)",
  enterprise: "var(--color-emerald-500)",
};

const Panel = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Card className="gap-2 overflow-hidden py-4">
    <CardHeader className="px-4">
      <CardTitle className="text-sm">{title}</CardTitle>
      {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
    </CardHeader>
    <CardContent className="px-3">{children}</CardContent>
  </Card>
);

const chartMargin = { top: 8, right: 6, bottom: 36, left: 6 };

// `ChoroplethChart` takes an absolute pixel `scale`, so it can't fit itself to a
// container. Fit El Salvador once at a reference width to derive the scale *per
// pixel* and the country's true aspect ratio; `<ResponsiveChoropleth>` measures
// its width and feeds `scale = width * SV_SCALE_PER_PX` so the map tracks resize.
// `margin.top: -100` cancels the chart's built-in +50px translate nudge (size-
// independent: it makes translate.y land at height/2), keeping the map centred.
const SV_REF_W = 768;
const svFit = geoMercator().fitWidth(SV_REF_W, SV_DEPARTMENTS);
const [[svX0, svY0], [svX1, svY1]] = geoPath(svFit).bounds(SV_DEPARTMENTS);
const SV_SCALE_PER_PX = svFit.scale() / SV_REF_W;
const SV_CENTER = (svFit.invert?.([(svX0 + svX1) / 2, (svY0 + svY1) / 2]) ?? [-88.9, 13.8]) as [number, number];
const SV_ASPECT = `${Math.round(svX1 - svX0)} / ${Math.round(svY1 - svY0)}`;
const SV_MARGIN = { top: -100, right: 0, bottom: 0, left: 0 };

/** Bklit's choropleth needs an explicit px `scale`; measure the box and keep it in sync. */
const ResponsiveChoropleth = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth); // sync first measure — don't wait on the first RO tick
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full">
      {width > 0 ? (
        <ChoroplethChart
          data={SV_DEPARTMENTS}
          center={SV_CENTER}
          scale={width * SV_SCALE_PER_PX}
          aspectRatio={SV_ASPECT}
          margin={SV_MARGIN}
        >
          {children}
        </ChoroplethChart>
      ) : null}
    </div>
  );
};

/** 5-step blue ramp over the card background, keyed to a 0..max value. */
const rampColor = (value: number, max: number) => {
  if (value <= 0) return "var(--muted)";
  const level = Math.min(4, Math.ceil((value / max) * 4));
  return `color-mix(in oklch, var(--chart-1) ${15 + level * 20}%, var(--card))`;
};

export const ReportsContent = () => {
  const [weeks, setWeeks] = useState(8);
  const revenue = ORDERS.filter((o) => o.status !== "refunded").reduce((s, o) => s + o.total, 0);

  const planSlices = PLANS.map((plan) => ({
    label: plan,
    value: CUSTOMERS.filter((c) => c.plan === plan).length,
    color: PLAN_COLOR[plan],
  }));
  const custWeekly = weekly(CUSTOMERS, (c) => c.createdAt, { weeks });
  const tktWeekly = weekly(TICKETS, (t) => t.openedAt, { weeks });
  const revWeekly = weekly(ORDERS, (o) => o.placedAt, { weeks, amountOf: (o) => o.total });
  const compare = custWeekly.map((d, i) => ({
    date: d.date,
    customers: d.count,
    tickets: tktWeekly[i].count,
  }));

  const orderBars = ORDER_STATUSES.map((status) => ({
    label: status,
    value: ORDERS.filter((o) => o.status === status).length,
  }));
  const priorityBars = PRIORITIES.map((priority) => ({
    label: priority,
    value: TICKETS.filter((t) => t.priority === priority).length,
  }));

  const deptCount = (name: string) => CUSTOMERS.filter((c) => c.department === name).length;
  const deptMax = Math.max(...SV_DEPARTMENTS.features.map((f) => deptCount(f.properties.name)), 1);

  return (
    <div className="flex flex-col gap-5">
      <StatRow
        items={[
          { label: "Customers", value: CUSTOMERS.length },
          { label: "Order revenue", value: currency(revenue), hint: "excludes refunds" },
          { label: "Orders", value: ORDERS.length },
          { label: "Tickets", value: TICKETS.length },
        ]}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Weekly trends</h2>
        <RangeToggle value={weeks} onChange={setWeeks} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="New customers" description="Signups per week">
          <AreaChart data={custWeekly} xDataKey="date" aspectRatio="2 / 1" margin={chartMargin}>
            <Grid />
            <XAxis numTicks={3} />
            <Area dataKey="count" fill="var(--chart-1)" fillOpacity={0.22} />
          </AreaChart>
        </Panel>
        <Panel title="Order revenue" description="Non-refunded value / week">
          <AreaChart data={revWeekly} xDataKey="date" aspectRatio="2 / 1" margin={chartMargin}>
            <Grid />
            <XAxis numTicks={3} />
            <Area dataKey="count" fill="var(--chart-2)" fillOpacity={0.22} />
          </AreaChart>
        </Panel>
        <Panel title="Customers vs tickets" description="New per week">
          <div className="mb-1 flex gap-3 px-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: "var(--chart-1)" }} />
              Customers
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: "var(--chart-3)" }} />
              Tickets
            </span>
          </div>
          <LineChart data={compare} xDataKey="date" aspectRatio="2 / 1" margin={chartMargin}>
            <Grid />
            <XAxis numTicks={3} />
            <Line dataKey="customers" stroke="var(--chart-1)" />
            <Line dataKey="tickets" stroke="var(--chart-3)" />
          </LineChart>
        </Panel>
      </div>

      <h2 className="text-sm font-medium text-muted-foreground">Breakdowns</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Customers by plan">
          <div className="flex items-center gap-5">
            <div className="w-36 shrink-0">
              <PieChart data={planSlices} innerRadius={44} padAngle={0.02} cornerRadius={4}>
                {planSlices.map((s, i) => (
                  <PieSlice key={s.label} index={i} />
                ))}
              </PieChart>
            </div>
            <ul className="flex flex-1 flex-col gap-1.5 text-sm">
              {planSlices.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="capitalize text-muted-foreground">{s.label}</span>
                  <span className="ml-auto tabular-nums">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title="Orders by status">
          <BarChart data={orderBars} xDataKey="label" aspectRatio="2 / 1" margin={{ ...chartMargin, left: 28 }}>
            <Grid />
            <YAxis numTicks={4} />
            <Bar dataKey="value" fill="var(--chart-1)" />
            <BarXAxis />
          </BarChart>
        </Panel>
        <Panel title="Tickets by priority">
          <BarChart data={priorityBars} xDataKey="label" aspectRatio="2 / 1" margin={{ ...chartMargin, left: 28 }}>
            <Grid />
            <YAxis numTicks={4} />
            <Bar dataKey="value" fill="var(--chart-3)" />
            <BarXAxis />
          </BarChart>
        </Panel>
      </div>

      <h2 className="text-sm font-medium text-muted-foreground">Geography</h2>
      <Panel title="Customers by department" description="El Salvador — geoBoundaries ADM1">
        <div className="mx-auto max-w-3xl">
          <ResponsiveChoropleth>
            <ChoroplethFeatureComponent
              stroke="var(--card)"
              strokeWidth={0.75}
              getFeatureColor={(f) => rampColor(deptCount(f.properties.name ?? ""), deptMax)}
            />
            <ChoroplethTooltip valueLabel="Customers" getFeatureValue={(f) => deptCount(f.properties.name ?? "")} />
          </ResponsiveChoropleth>
        </div>
      </Panel>
    </div>
  );
};
