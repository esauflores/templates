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
import { type MemberStatus, type Role, ROLES, TEAM, type TeamMember } from "#/features/admin/data/team";

const ROLE_TONE: Record<Role, "green" | "blue" | "gray"> = { owner: "green", admin: "blue", member: "gray" };
const STATUS_TONE: Record<MemberStatus, "green" | "amber"> = { active: "green", invited: "amber" };

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  role: z.enum(ROLES as [Role, ...Role[]]),
  status: z.enum(["active", "invited"]),
});
type Draft = z.infer<typeof schema>;

export const TeamContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<TeamMember>(TEAM, "member");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const columns = useMemo<Column<TeamMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <StatusBadge label={row.original.role} tone={ROLE_TONE[row.original.role]} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />,
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
                create({ ...row.original, name: `${row.original.name} (copy)` }, `${row.original.name} (copy)`)
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
          title="Invite member"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">Invite member</Button>}
        >
          <MemberForm
            submitLabel="Send invite"
            defaultStatus="invited"
            onSubmit={(d) => {
              create(d, d.name);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Members", value: items.length },
          { label: "Active", value: items.filter((m) => m.status === "active").length },
          { label: "Invited", value: items.filter((m) => m.status === "invited").length },
          { label: "Admins", value: items.filter((m) => m.role !== "member").length },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter members…"
        storageKey="team"
        exportName="team"
        facets={["role", "status"]}
        bulkActions={bulkRemove(removeMany, "member")}
        empty={
          <EmptyState
            message="No team members."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Invite member
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit member" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <MemberForm
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

const MemberForm = ({
  initial,
  submitLabel,
  defaultStatus = "active",
  onSubmit,
}: {
  initial?: TeamMember;
  submitLabel: string;
  defaultStatus?: MemberStatus;
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
    role: initial?.role ?? "member",
    status: initial?.status ?? defaultStatus,
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Name" htmlFor="member-name" error={errors.name?.message}>
        <Input id="member-name" autoFocus {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="member-email" error={errors.email?.message}>
        <Input id="member-email" type="email" {...register("email")} />
      </Field>
      <SelectField
        control={control}
        name="role"
        id="member-role"
        label="Role"
        options={ROLES}
        error={errors.role?.message}
      />
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
