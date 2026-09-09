import { useMemo, useState } from "react";
import { z } from "zod";

import { StatRow } from "#/components/analytics/stats";
import { bulkRemove, type Column, DataGrid } from "#/components/crud/data-grid";
import { EmptyState } from "#/components/crud/empty-state";
import { Field, SelectField } from "#/components/crud/field";
import { FormFooter } from "#/components/crud/form-footer";
import { CrudDialog } from "#/components/crud/page";
import { RowActions } from "#/components/crud/row-actions";
import { useCrud } from "#/components/crud/use-crud";
import { useZodForm } from "#/components/crud/use-zod-form";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { StatusBadge } from "#/components/ui/status-badge";
import { ORDER_STATUSES, ORDERS, type Order, type OrderStatus } from "#/features/sales/data/orders";
import { currency, daysAgo, fmtDate } from "#/lib/format";

const TONE: Record<OrderStatus, "amber" | "green" | "blue" | "red"> = {
  pending: "amber",
  paid: "green",
  shipped: "blue",
  refunded: "red",
};

const schema = z.object({
  ref: z.string().trim().min(1, "Ref is required"),
  customer: z.string().trim().min(1, "Customer is required"),
  total: z.coerce.number("Enter a number").min(0, "Must be 0 or more"),
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
});
type Draft = z.infer<typeof schema>;

export const OrdersContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Order>(ORDERS, "order");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const revenue = items.filter((o) => o.status !== "refunded").reduce((sum, o) => sum + o.total, 0);
  const unfulfilled = items.filter((o) => o.status === "pending" || o.status === "paid").length;
  const submit = (d: Draft): Omit<Order, "id"> => ({ ...d, placedAt: daysAgo(0) });

  const columns = useMemo<Column<Order>[]>(
    () => [
      {
        accessorKey: "ref",
        header: "Ref",
        cell: ({ row }) => <span className="font-mono">{row.original.ref}</span>,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => <span className="font-medium">{row.original.customer}</span>,
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => <span className="tabular-nums">{currency(row.original.total)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={TONE[row.original.status]} />,
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.placedAt)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              deleteLabel={row.original.ref}
              onEdit={() => setEditing(row.original)}
              onDuplicate={() =>
                create({ ...row.original, ref: `${row.original.ref}-COPY` }, `${row.original.ref}-COPY`)
              }
              onDelete={() => remove(row.original.id, row.original.ref)}
            />
          </div>
        ),
      },
    ],
    [create, remove],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CrudDialog
          title="New order"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New order</Button>}
        >
          <OrderForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(submit(d), d.ref);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Orders", value: items.length },
          { label: "Revenue", value: currency(revenue), hint: "excludes refunds" },
          { label: "Unfulfilled", value: unfulfilled, hint: "pending + paid" },
          { label: "Refunded", value: items.filter((o) => o.status === "refunded").length },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter orders…"
        storageKey="orders"
        exportName="orders"
        facets={["status"]}
        bulkActions={bulkRemove(removeMany, "order")}
        empty={
          <EmptyState
            message="No orders yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New order
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit order" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <OrderForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, submit(d), d.ref);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const OrderForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Order;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const [ref] = useState(() => initial?.ref ?? `ORD-${8300 + Math.floor(Math.random() * 399)}`);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    ref,
    customer: initial?.customer ?? "",
    total: initial?.total ?? 0,
    status: initial?.status ?? "pending",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ref" htmlFor="order-ref" error={errors.ref?.message}>
          <Input id="order-ref" {...register("ref")} />
        </Field>
        <Field label="Total (USD)" htmlFor="order-total" error={errors.total?.message}>
          <Input id="order-total" type="number" min={0} {...register("total", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Customer" htmlFor="order-customer" error={errors.customer?.message}>
        <Input id="order-customer" autoFocus {...register("customer")} />
      </Field>
      <SelectField
        control={control}
        name="status"
        id="order-status"
        label="Status"
        options={ORDER_STATUSES}
        error={errors.status?.message}
      />
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
