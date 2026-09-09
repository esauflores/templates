import { daysAgo } from "#/lib/format";

export type ActivityKind = "created" | "updated" | "deleted" | "comment" | "login";
export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  actor: string;
  target: string;
  at: string;
};

export const ACTIVITY_KINDS: ActivityKind[] = ["created", "updated", "deleted", "comment", "login"];

let n = 0;
const e = (kind: ActivityKind, actor: string, target: string, hoursAgo: number): ActivityEvent => ({
  id: `act-${(n += 1)}`,
  kind,
  actor,
  target,
  at: daysAgo(hoursAgo / 24),
});

export const ACTIVITY: ActivityEvent[] = [
  e("login", "Ada Lovelace", "signed in", 1),
  e("created", "Ada Lovelace", "invoice INV-2417", 2),
  e("updated", "Alan Turing", "project “Checkout redesign”", 4),
  e("comment", "Grace Hopper", "ticket “Webhook retries not firing”", 6),
  e("updated", "Alan Turing", "customer “Globex” plan → pro", 9),
  e("deleted", "Grace Hopper", "product “ACC-202 Wall Charger”", 22),
  e("created", "Katherine Johnson", "order ORD-8231", 27),
  e("login", "Margaret Hamilton", "signed in", 30),
  e("comment", "Margaret Hamilton", "ticket “Slow dashboard load”", 33),
  e("created", "Ada Lovelace", "folder “Design/Exports”", 40),
  e("updated", "Donald Knuth", "team member “Radia Perlman” role → member", 46),
  e("created", "Grace Hopper", "ticket “API rate limit too low”", 52),
  e("updated", "Alan Turing", "invoice INV-2409 status → paid", 68),
  e("deleted", "Ada Lovelace", "project “Legacy import”", 74),
  e("login", "Barbara Liskov", "signed in", 80),
  e("comment", "Katherine Johnson", "order ORD-8225", 96),
  e("updated", "Donald Knuth", "product “GAD-011 Gadget Max” stock → 0", 110),
  e("created", "Margaret Hamilton", "customer “Pied Piper”", 124),
];
