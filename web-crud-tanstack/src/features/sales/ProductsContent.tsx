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
import {
  LOW_STOCK,
  PRODUCT_STATUSES,
  PRODUCTS,
  type Product,
  type ProductStatus,
} from "#/features/sales/data/products";
import { currency } from "#/lib/format";
import { cn } from "#/lib/utils";

const TONE: Record<ProductStatus, "green" | "gray"> = { active: "green", draft: "gray" };

const schema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  name: z.string().trim().min(1, "Name is required"),
  price: z.coerce.number("Enter a number").min(0, "Must be 0 or more"),
  stock: z.coerce.number("Enter a number").int("Whole units only").min(0, "Must be 0 or more"),
  status: z.enum(PRODUCT_STATUSES as [ProductStatus, ...ProductStatus[]]),
});
type Draft = z.infer<typeof schema>;

export const ProductsContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Product>(PRODUCTS, "product");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const lowStock = items.filter((p) => p.stock <= LOW_STOCK).length;
  const inventoryValue = items.reduce((sum, p) => sum + p.price * p.stock, 0);

  const columns = useMemo<Column<Product>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => <span className="font-mono">{row.original.sku}</span>,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <span className="tabular-nums">{currency(row.original.price)}</span>,
      },
      {
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) => (
          <span
            className={cn(
              "tabular-nums",
              row.original.stock <= LOW_STOCK && "font-medium text-red-600 dark:text-red-400",
            )}
          >
            {row.original.stock}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={TONE[row.original.status]} />,
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
                  { ...row.original, sku: `${row.original.sku}-COPY`, name: `${row.original.name} (copy)` },
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Products</h1>
        <CrudDialog
          title="New product"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New product</Button>}
        >
          <ProductForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(d, d.name);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Products", value: items.length },
          { label: "Active", value: items.filter((p) => p.status === "active").length },
          { label: "Low stock", value: lowStock, hint: `at or below ${LOW_STOCK} units` },
          { label: "Inventory value", value: currency(inventoryValue) },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter products…"
        storageKey="products"
        exportName="products"
        facets={["status"]}
        bulkActions={bulkRemove(removeMany, "product")}
        empty={
          <EmptyState
            message="No products yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New product
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit product" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <ProductForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, d, d.name);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const ProductForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Product;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    sku: initial?.sku ?? "SKU-000",
    name: initial?.name ?? "",
    price: initial?.price ?? 19,
    stock: initial?.stock ?? 0,
    status: initial?.status ?? "draft",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field label="SKU" htmlFor="product-sku" error={errors.sku?.message}>
          <Input id="product-sku" {...register("sku")} />
        </Field>
        <SelectField
          control={control}
          name="status"
          id="product-status"
          label="Status"
          options={PRODUCT_STATUSES}
          error={errors.status?.message}
        />
      </div>
      <Field label="Name" htmlFor="product-name" error={errors.name?.message}>
        <Input id="product-name" autoFocus {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (USD)" htmlFor="product-price" error={errors.price?.message}>
          <Input id="product-price" type="number" min={0} {...register("price", { valueAsNumber: true })} />
        </Field>
        <Field label="Stock" htmlFor="product-stock" error={errors.stock?.message}>
          <Input id="product-stock" type="number" min={0} {...register("stock", { valueAsNumber: true })} />
        </Field>
      </div>
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
