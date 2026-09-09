import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "#/components/ui/card";
import { StatusBadge } from "#/components/ui/status-badge";
import { TICKET_STATUSES, type Ticket, type TicketStatus, TICKETS } from "#/features/support/data/tickets";
import { fmtDate } from "#/lib/format";
import { cn } from "#/lib/utils";

const COLUMN_LABEL: Record<TicketStatus, string> = { open: "Open", pending: "Pending", closed: "Closed" };
const PRIORITY_TONE = { low: "gray", normal: "blue", high: "amber", urgent: "red" } as const;

const TicketCard = ({ ticket, dragging }: { ticket: Ticket; dragging?: boolean }) => (
  <Card
    className={cn(
      "gap-2 p-3 shadow-none",
      dragging ? "cursor-grabbing rotate-2 shadow-md" : "cursor-grab active:cursor-grabbing",
    )}
  >
    <p className="text-sm font-medium">{ticket.subject}</p>
    <div className="flex items-center justify-between">
      <StatusBadge label={ticket.priority} tone={PRIORITY_TONE[ticket.priority]} />
      <span className="text-xs text-muted-foreground">{ticket.requester}</span>
    </div>
    <p className="text-xs text-muted-foreground">Opened {fmtDate(ticket.openedAt)}</p>
  </Card>
);

const SortableTicket = ({ ticket }: { ticket: Ticket }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
};

const Column = ({ status, tickets }: { status: TicketStatus; tickets: Ticket[] }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[calc(100dvh-10rem)] flex-col gap-3 rounded-lg border bg-muted/30 p-3 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between px-1 text-sm font-medium">
        <span>{COLUMN_LABEL[status]}</span>
        <span className="tabular-nums text-muted-foreground">{tickets.length}</span>
      </div>
      <div className="min-h-0 space-y-3 overflow-y-auto">
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((t) => (
            <SortableTicket key={t.id} ticket={t} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Drop tickets here</p>
        )}
      </div>
    </div>
  );
};

export const BoardContent = () => {
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const startStatus = tickets.find((t) => t.id === activeId)?.status;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnOf = (id: string): TicketStatus =>
    (TICKET_STATUSES as readonly string[]).includes(id)
      ? (id as TicketStatus)
      : (tickets.find((t) => t.id === id)?.status ?? "open");

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = columnOf(activeKey);
    const to = columnOf(overKey);
    if (from === to) return;

    setTickets((prev) => {
      const moving = prev.find((t) => t.id === activeKey);
      if (!moving) return prev;
      const without = prev.filter((t) => t.id !== activeKey);
      const overIndex = without.findIndex((t) => t.id === overKey);
      const insertAt = overIndex >= 0 ? overIndex : without.length;
      const next = [...without];
      next.splice(insertAt, 0, { ...moving, status: to });
      return next;
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const target = columnOf(overKey);

    setTickets((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeKey);
      if (oldIndex < 0) return prev;
      const withStatus = prev.map((t) => (t.id === activeKey ? { ...t, status: target } : t));
      const overIndex = prev.findIndex((t) => t.id === overKey);
      return overIndex >= 0 ? arrayMove(withStatus, oldIndex, overIndex) : withStatus;
    });

    const moved = tickets.find((t) => t.id === activeKey);
    if (moved && startStatus && startStatus !== target) {
      toast.success(`“${moved.subject}” → ${COLUMN_LABEL[target]}`);
    }
  };

  const active = tickets.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {TICKET_STATUSES.map((status) => (
          <Column key={status} status={status} tickets={tickets.filter((t) => t.status === status)} />
        ))}
      </div>
      <DragOverlay>{active ? <TicketCard ticket={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
};
