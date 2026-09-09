import { Link } from "@tanstack/react-router";
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
import { CUSTOMERS, type Customer, PLANS, type Plan } from "#/features/sales/data/customers";
import { SV_DEPARTMENT_NAMES } from "#/features/sales/data/sv-departments";
import { currency, daysAgo, fmtDate } from "#/lib/format";

const TONE: Record<Plan, "gray" | "blue" | "green"> = { free: "gray", pro: "blue", enterprise: "green" };

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  plan: z.enum(PLANS as [Plan, ...Plan[]]),
  mrr: z.coerce.number("Enter a number").min(0, "Must be 0 or more"),
  department: z.string().min(1, "Pick a department"),
});
type Draft = z.infer<typeof schema>;

export const CustomersContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Customer>(CUSTOMERS, "customer");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const mrr = items.reduce((sum, c) => sum + c.mrr, 0);
  const submit = (d: Draft): Omit<Customer, "id"> => ({ ...d, createdAt: daysAgo(0) });

  const columns = useMemo<Column<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link to="/customers/$id" params={{ id: row.original.id }} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: "plan",
        header: "Plan",
        cell: ({ row }) => <StatusBadge label={row.original.plan} tone={TONE[row.original.plan]} />,
      },
      {
        accessorKey: "mrr",
        header: "MRR",
        cell: ({ row }) => <span className="tabular-nums">{currency(row.original.mrr)}</span>,
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.department}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Since",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              deleteLabel={row.original.name}
              onEdit={() => setEditing(row.original)}
              onDuplicate={() =>
                create(
                  { ...row.original, name: `${row.original.name} (copy)`, createdAt: daysAgo(0) },
                  `${row.original.name} (copy)`,
                )
              }
              onDelete={() => remove(row.original.id, row.original.name)}
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
          title="New customer"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New customer</Button>}
        >
          <CustomerForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(submit(d), d.name);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Customers", value: items.length },
          { label: "MRR", value: currency(mrr) },
          { label: "Paying", value: items.filter((c) => c.mrr > 0).length },
          { label: "Enterprise", value: items.filter((c) => c.plan === "enterprise").length },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter customers…"
        storageKey="customers"
        exportName="customers"
        facets={["plan"]}
        bulkActions={bulkRemove(removeMany, "customer")}
        empty={
          <EmptyState
            message="No customers yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New customer
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit customer" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <CustomerForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, submit(d), d.name);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const CustomerForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Customer;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    plan: initial?.plan ?? "pro",
    mrr: initial?.mrr ?? 249,
    department: initial?.department ?? SV_DEPARTMENT_NAMES[0],
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Name" htmlFor="customer-name" error={errors.name?.message}>
        <Input id="customer-name" autoFocus {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="customer-email" error={errors.email?.message}>
        <Input id="customer-email" type="email" {...register("email")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={control}
          name="plan"
          id="customer-plan"
          label="Plan"
          options={PLANS}
          error={errors.plan?.message}
        />
        <Field label="MRR (USD)" htmlFor="customer-mrr" error={errors.mrr?.message}>
          <Input id="customer-mrr" type="number" min={0} {...register("mrr", { valueAsNumber: true })} />
        </Field>
      </div>
      <SelectField
        control={control}
        name="department"
        id="customer-department"
        label="Department"
        options={SV_DEPARTMENT_NAMES}
        capitalize={false}
        error={errors.department?.message}
      />
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
