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
import { INVOICE_STATUSES, INVOICES, type Invoice, type InvoiceStatus } from "#/features/sales/data/invoices";
import { currency, daysAgo, fmtDate } from "#/lib/format";

const TONE: Record<InvoiceStatus, "green" | "blue" | "red"> = { paid: "green", open: "blue", overdue: "red" };

const schema = z.object({
  number: z.string().trim().min(1, "Number is required"),
  customer: z.string().trim().min(1, "Customer is required"),
  amount: z.coerce.number("Enter a number").min(0, "Must be 0 or more"),
  status: z.enum(INVOICE_STATUSES as [InvoiceStatus, ...InvoiceStatus[]]),
});
type Draft = z.infer<typeof schema>;

export const InvoicesContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Invoice>(INVOICES, "invoice");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);

  const sum = (s: InvoiceStatus) => items.filter((i) => i.status === s).reduce((t, i) => t + i.amount, 0);
  const submit = (d: Draft): Omit<Invoice, "id"> => ({ ...d, dueDate: daysAgo(-14) });

  const columns = useMemo<Column<Invoice>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Number",
        cell: ({ row }) => <span className="font-mono">{row.original.number}</span>,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => <span className="font-medium">{row.original.customer}</span>,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => <span className="tabular-nums">{currency(row.original.amount)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={TONE[row.original.status]} />,
      },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.dueDate)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              deleteLabel={row.original.number}
              onEdit={() => setEditing(row.original)}
              onDuplicate={() =>
                create({ ...row.original, number: `${row.original.number}-COPY` }, `${row.original.number}-COPY`)
              }
              onDelete={() => remove(row.original.id, row.original.number)}
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
          title="New invoice"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New invoice</Button>}
        >
          <InvoiceForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(submit(d), d.number);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Invoices", value: items.length },
          { label: "Paid", value: currency(sum("paid")) },
          { label: "Open", value: currency(sum("open")) },
          { label: "Overdue", value: currency(sum("overdue")) },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter invoices…"
        storageKey="invoices"
        exportName="invoices"
        facets={["status"]}
        bulkActions={bulkRemove(removeMany, "invoice")}
        empty={
          <EmptyState
            message="No invoices yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New invoice
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit invoice" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <InvoiceForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, submit(d), d.number);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const InvoiceForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Invoice;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const [number] = useState(() => initial?.number ?? `INV-${2500 + Math.floor(Math.random() * 499)}`);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    number,
    customer: initial?.customer ?? "",
    amount: initial?.amount ?? 249,
    status: initial?.status ?? "open",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Number" htmlFor="invoice-number" error={errors.number?.message}>
          <Input id="invoice-number" {...register("number")} />
        </Field>
        <Field label="Amount (USD)" htmlFor="invoice-amount" error={errors.amount?.message}>
          <Input id="invoice-amount" type="number" min={0} {...register("amount", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Customer" htmlFor="invoice-customer" error={errors.customer?.message}>
        <Input id="invoice-customer" autoFocus {...register("customer")} />
      </Field>
      <SelectField
        control={control}
        name="status"
        id="invoice-status"
        label="Status"
        options={INVOICE_STATUSES}
        error={errors.status?.message}
      />
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
