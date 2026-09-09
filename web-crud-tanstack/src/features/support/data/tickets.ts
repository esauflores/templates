import { daysAgo } from "#/lib/format";

export type Priority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "pending" | "closed";
export type Ticket = {
  id: string;
  subject: string;
  requester: string;
  priority: Priority;
  status: TicketStatus;
  openedAt: string;
};

export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
export const TICKET_STATUSES: TicketStatus[] = ["open", "pending", "closed"];

let n = 0;
const t = (subject: string, requester: string, priority: Priority, status: TicketStatus, opened: number): Ticket => ({
  id: `tkt-${(n += 1)}`,
  subject,
  requester,
  priority,
  status,
  openedAt: daysAgo(opened),
});

export const TICKETS: Ticket[] = [
  t("Login loop after password reset", "Globex", "urgent", "open", 0),
  t("Export to CSV missing columns", "Initech", "high", "open", 1),
  t("Invoice PDF shows wrong tax", "Acme Inc", "high", "pending", 1),
  t("Feature request: dark mode", "Hooli", "low", "open", 3),
  t("Webhook retries not firing", "Umbrella Co", "urgent", "pending", 4),
  t("Typo on pricing page", "Wonka Foods", "low", "closed", 6),
  t("2FA codes rejected", "Stark Industries", "high", "open", 7),
  t("Slow dashboard load", "Wayne Enterprises", "normal", "pending", 9),
  t("Cancel subscription flow unclear", "Cyberdyne", "normal", "closed", 14),
  t("API rate limit too low", "Tyrell Corp", "normal", "open", 20),
];
