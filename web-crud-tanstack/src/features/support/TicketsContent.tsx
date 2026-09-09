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
  PRIORITIES,
  type Priority,
  TICKET_STATUSES,
  type Ticket,
  type TicketStatus,
  TICKETS,
} from "#/features/support/data/tickets";
import { daysAgo, fmtDate } from "#/lib/format";

const PRIORITY_TONE: Record<Priority, "gray" | "blue" | "amber" | "red"> = {
  low: "gray",
  normal: "blue",
  high: "amber",
  urgent: "red",
};
const STATUS_TONE: Record<TicketStatus, "green" | "amber" | "gray"> = {
  open: "green",
  pending: "amber",
  closed: "gray",
};

const schema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  requester: z.string().trim().min(1, "Requester is required"),
  priority: z.enum(PRIORITIES as [Priority, ...Priority[]]),
  status: z.enum(TICKET_STATUSES as [TicketStatus, ...TicketStatus[]]),
});
type Draft = z.infer<typeof schema>;

export const TicketsContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<Ticket>(TICKETS, "ticket");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);

  const submit = (d: Draft): Omit<Ticket, "id"> => ({ ...d, openedAt: daysAgo(0) });

  const columns = useMemo<Column<Ticket>[]>(
    () => [
      {
        accessorKey: "subject",
        header: "Subject",
        cell: ({ row }) => <span className="font-medium">{row.original.subject}</span>,
      },
      {
        accessorKey: "requester",
        header: "Requester",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.requester}</span>,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <StatusBadge label={row.original.priority} tone={PRIORITY_TONE[row.original.priority]} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />,
      },
      {
        accessorKey: "openedAt",
        header: "Opened",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.openedAt)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              deleteLabel={row.original.subject}
              onEdit={() => setEditing(row.original)}
              onDuplicate={() =>
                create({ ...row.original, subject: `${row.original.subject} (copy)` }, `${row.original.subject} (copy)`)
              }
              onDelete={() => remove(row.original.id, row.original.subject)}
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
          title="New ticket"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New ticket</Button>}
        >
          <TicketForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(submit(d), d.subject);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Tickets", value: items.length },
          { label: "Open", value: items.filter((t) => t.status === "open").length },
          { label: "Pending", value: items.filter((t) => t.status === "pending").length },
          {
            label: "Urgent",
            value: items.filter((t) => t.priority === "urgent" && t.status !== "closed").length,
            hint: "not closed",
          },
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter tickets…"
        storageKey="tickets"
        exportName="tickets"
        facets={["priority", "status"]}
        bulkActions={bulkRemove(removeMany, "ticket")}
        empty={
          <EmptyState
            message="No tickets yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New ticket
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit ticket" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <TicketForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, submit(d), d.subject);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const TicketForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Ticket;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    subject: initial?.subject ?? "",
    requester: initial?.requester ?? "",
    priority: initial?.priority ?? "normal",
    status: initial?.status ?? "open",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Subject" htmlFor="ticket-subject" error={errors.subject?.message}>
        <Input id="ticket-subject" autoFocus {...register("subject")} />
      </Field>
      <Field label="Requester" htmlFor="ticket-requester" error={errors.requester?.message}>
        <Input id="ticket-requester" {...register("requester")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={control}
          name="priority"
          id="ticket-priority"
          label="Priority"
          options={PRIORITIES}
          error={errors.priority?.message}
        />
        <SelectField
          control={control}
          name="status"
          id="ticket-status"
          label="Status"
          options={TICKET_STATUSES}
          error={errors.status?.message}
        />
      </div>
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};
