import { DataTable } from "#/components/crud/data-table";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { StatusBadge } from "#/components/ui/status-badge";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { BILLING, METERS } from "#/features/account/data/billing";
import { INVOICES } from "#/features/sales/data/invoices";
import { currency, fmtDate } from "#/lib/format";

const INVOICE_TONE = { paid: "green", open: "blue", overdue: "red" } as const;

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

const history = [...INVOICES].sort((a, b) => +new Date(b.dueDate) - +new Date(a.dueDate)).slice(0, 6);

export const BillingContent = () => (
  <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Current plan</CardDescription>
          <CardTitle className="text-2xl">{BILLING.plan}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">
            {currency(BILLING.amount)} / {BILLING.interval} · {BILLING.seats} seats · renews {fmtDate(BILLING.renewsAt)}
          </p>
          <div className="flex gap-2">
            <Button size="sm">Change plan</Button>
            <Button size="sm" variant="outline">
              Cancel subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Payment method</CardDescription>
          <CardTitle className="text-2xl">
            {BILLING.card.brand} •••• {BILLING.card.last4}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">Expires {BILLING.card.exp}</p>
          <Button size="sm" variant="outline" className="w-fit">
            Update card
          </Button>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Usage this period</CardTitle>
        <CardDescription>Resets on {fmtDate(BILLING.renewsAt)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {METERS.map((m) => {
          const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
          return (
            <div key={m.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {compact(m.used)}
                  {m.unit ? ` ${m.unit}` : ""} / {compact(m.limit)}
                  {m.unit ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Invoice history</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          rows={history}
          empty="No invoices."
          head={
            <>
              <TableHead>Number</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </>
          }
          render={(inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono">{inv.number}</TableCell>
              <TableCell className="text-right tabular-nums">{currency(inv.amount)}</TableCell>
              <TableCell>
                <StatusBadge label={inv.status} tone={INVOICE_TONE[inv.status]} />
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="xs">
                  Download
                </Button>
              </TableCell>
            </TableRow>
          )}
        />
      </CardContent>
    </Card>
  </div>
);
