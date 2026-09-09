import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { DataTable } from "#/components/crud/data-table";
import { Field, SelectField } from "#/components/crud/field";
import { FormFooter } from "#/components/crud/form-footer";
import { CrudDialog } from "#/components/crud/page";
import { StatusBadge } from "#/components/crud/status-badge";
import { useCrud } from "#/components/crud/use-crud";
import { useZodForm } from "#/components/crud/use-zod-form";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { type CalEvent, EVENT_KINDS, EVENTS, type EventKind } from "#/features/workspace/data/events";
import { cn } from "#/lib/utils";

const KIND_DOT: Record<EventKind, string> = {
  meeting: "bg-blue-500",
  deadline: "bg-red-500",
  reminder: "bg-amber-500",
};
const KIND_TONE: Record<EventKind, "blue" | "red" | "amber"> = {
  meeting: "blue",
  deadline: "red",
  reminder: "amber",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** `date-fns` `format`/`parse` are local, so the `yyyy-MM-dd` key never shifts across timezones. */
const key = (d: Date) => format(d, "yyyy-MM-dd");
const parseKey = (s: string) => parse(s, "yyyy-MM-dd", new Date());

export const CalendarContent = () => {
  const { items, create } = useCrud<CalEvent>(EVENTS, "event");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [presetDate, setPresetDate] = useState(() => key(new Date()));

  // Full weeks (Mon-first) covering the visible month.
  const monthStart = startOfMonth(cursor);
  const lead = (getDay(monthStart) + 6) % 7;
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(cursor) });
  const cells: (Date | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of items) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  const openFor = (date: string) => {
    setPresetDate(date);
    setCreateOpen(true);
  };

  const agenda = items
    .filter((e) => isSameMonth(parseKey(e.date), cursor))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{format(cursor, "LLLL yyyy")}</h2>
        <div className="flex gap-1">
          <Button type="button" size="sm" className="mr-1" onClick={() => openFor(key(new Date()))}>
            <Plus />
            <span className="hidden sm:inline">New event</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        {/* Below ~640px the 7-day grid would be unreadable — scroll it instead of squishing. */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-r border-b last:border-r-0",
                    !date && "bg-muted/20",
                    (i + 1) % 7 === 0 && "border-r-0",
                  )}
                >
                  {date && (
                    <button
                      type="button"
                      onClick={() => openFor(key(date))}
                      className="flex min-h-24 w-full flex-col p-1.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                          isToday(date) ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <ul className="mt-1 flex w-full flex-col gap-0.5">
                        {(byDay.get(key(date)) ?? []).map((e) => (
                          <li key={e.id} className="flex items-center gap-1 truncate text-xs">
                            <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[e.kind])} />
                            <span className="truncate">{e.title}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda — {format(cursor, "LLLL yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={agenda}
            empty="No events this month."
            head={
              <>
                <TableHead className="w-40">Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
              </>
            }
            render={(e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(parseKey(e.date), "EEE, MMM d")}
                </TableCell>
                <TableCell className="font-medium">{e.title}</TableCell>
                <TableCell>
                  <StatusBadge label={e.kind} tone={KIND_TONE[e.kind]} />
                </TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>

      <CrudDialog title="New event" open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && (
          <EventForm
            presetDate={presetDate}
            onSubmit={(draft) => {
              create(draft, draft.title);
              setCreateOpen(false);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: z.string().min(1, "Pick a date"),
  kind: z.enum(EVENT_KINDS as [EventKind, ...EventKind[]]),
});
type Draft = z.infer<typeof schema>;

const EventForm = ({ presetDate, onSubmit }: { presetDate: string; onSubmit: (draft: Draft) => void }) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    title: "",
    date: presetDate,
    kind: "meeting",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Title" htmlFor="event-title" error={errors.title?.message}>
        <Input id="event-title" autoFocus {...register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="event-date" error={errors.date?.message}>
          <Input id="event-date" type="date" {...register("date")} />
        </Field>
        <SelectField
          control={control}
          name="kind"
          id="event-kind"
          label="Type"
          options={EVENT_KINDS}
          error={errors.kind?.message}
        />
      </div>
      <FormFooter submitLabel="Add event" />
    </form>
  );
};
