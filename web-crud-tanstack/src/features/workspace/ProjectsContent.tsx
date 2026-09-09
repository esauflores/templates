import { useMemo, useState } from "react";
import { z } from "zod";

import { bulkRemove, type Column, DataGrid } from "#/components/crud/data-grid";
import { EmptyState } from "#/components/crud/empty-state";
import { Field, SelectField } from "#/components/crud/field";
import { FormFooter } from "#/components/crud/form-footer";
import { CrudDialog } from "#/components/crud/page";
import { RowActions } from "#/components/crud/row-actions";
import { StatRow } from "#/components/crud/stats";
import { StatusBadge } from "#/components/crud/status-badge";
import { useCrud } from "#/components/crud/use-crud";
import { useZodForm } from "#/components/crud/use-zod-form";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PROJECT_STATUSES, PROJECTS, type Project, type ProjectStatus } from "#/features/workspace/data/projects";
import { crudPersist } from "#/lib/api";
import { daysAgo, fmtDate } from "#/lib/format";

// Reference example: with `VITE_API_URL` set, every mutation persists to
// `${VITE_API_URL}/projects`; unset, `crudPersist` no-ops and this stays in-memory.
const persist = crudPersist<Project>("projects");

const TONE: Record<ProjectStatus, "green" | "amber" | "gray"> = {
  active: "green",
  paused: "amber",
  archived: "gray",
};

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  status: z.enum(PROJECT_STATUSES as [ProjectStatus, ...ProjectStatus[]]),
});
type Draft = z.infer<typeof schema>;

export const ProjectsContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Project>(PROJECTS, "project", { persist });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const count = (s: ProjectStatus) => items.filter((p) => p.status === s).length;
  const submit = (d: Draft): Omit<Project, "id"> => ({ ...d, updatedAt: daysAgo(0) });

  const columns = useMemo<Column<Project>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={TONE[row.original.status]} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.updatedAt)}</span>,
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
                create({ ...submit(row.original), name: `${row.original.name} (copy)` }, `${row.original.name} (copy)`)
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
          title="New project"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New project</Button>}
        >
          <ProjectForm
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
          { label: "Total", value: items.length },
          { label: "Active", value: count("active") },
          { label: "Paused", value: count("paused") },
          { label: "Archived", value: count("archived") },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter projects…"
        storageKey="projects"
        exportName="projects"
        facets={["status"]}
        bulkActions={bulkRemove(removeMany, "project")}
        empty={
          <EmptyState
            message="No projects yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New project
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit project" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <ProjectForm
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

const ProjectForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Project;
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
    status: initial?.status ?? "active",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Name" htmlFor="project-name" error={errors.name?.message}>
        <Input id="project-name" autoFocus placeholder="New project" {...register("name")} />
      </Field>
      <SelectField
        control={control}
        name="status"
        id="project-status"
        label="Status"
        options={PROJECT_STATUSES}
        error={errors.status?.message}
      />
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
