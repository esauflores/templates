import { format, setDate } from "date-fns";

export type EventKind = "meeting" | "deadline" | "reminder";
export type CalEvent = { id: string; title: string; kind: EventKind; date: string };

export const EVENT_KINDS: EventKind[] = ["meeting", "deadline", "reminder"];

/** Local `yyyy-MM-dd` for the given day-of-month in the current month. */
const dayOfMonth = (day: number) => format(setDate(new Date(), day), "yyyy-MM-dd");

let n = 0;
const ev = (title: string, kind: EventKind, day: number): CalEvent => ({
  id: `evt-${(n += 1)}`,
  title,
  kind,
  date: dayOfMonth(day),
});

export const EVENTS: CalEvent[] = [
  ev("Sprint planning", "meeting", 2),
  ev("Design review", "meeting", 4),
  ev("Invoice run", "deadline", 5),
  ev("1:1 with Ada", "meeting", 8),
  ev("Ship checkout redesign", "deadline", 12),
  ev("Renew SSL cert", "reminder", 14),
  ev("Board sync", "meeting", 15),
  ev("Quarterly report due", "deadline", 18),
  ev("Team lunch", "reminder", 19),
  ev("Customer call: Umbrella Co", "meeting", 22),
  ev("Security patch window", "deadline", 25),
  ev("Retro", "meeting", 27),
];
