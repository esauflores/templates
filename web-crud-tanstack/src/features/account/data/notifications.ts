import { daysAgo } from "#/lib/format";

export type NotificationKind = "mention" | "assigned" | "billing" | "system" | "comment";
export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
};

export const NOTIFICATION_KINDS: NotificationKind[] = ["mention", "assigned", "comment", "billing", "system"];

let n = 0;
const note = (kind: NotificationKind, title: string, body: string, hoursAgo: number, read = false): Notification => ({
  id: `ntf-${(n += 1)}`,
  kind,
  title,
  body,
  at: daysAgo(hoursAgo / 24),
  read,
});

export const NOTIFICATIONS: Notification[] = [
  note("mention", "Grace Hopper mentioned you", "“@you can you review the webhook retry logic?”", 1),
  note("assigned", "Ticket assigned to you", "“2FA codes rejected” — Stark Industries", 3),
  note("comment", "New comment on Checkout redesign", "Alan Turing replied to your note", 6),
  note("billing", "Payment succeeded", "Visa •••• 4242 charged $199.00 for the Pro plan", 26, true),
  note("system", "Backup completed", "Nightly export finished in 4m 12s", 30, true),
  note("mention", "Katherine Johnson mentioned you", "“@you the report numbers look off for Q3”", 34),
  note("assigned", "Invoice INV-2417 is overdue", "Hooli — $249.00, due 9 days ago", 40, true),
  note("comment", "New comment on order ORD-8231", "“Customer asked to expedite shipping”", 52, true),
  note("system", "New sign-in", "Chrome on macOS from San Salvador, SV", 72, true),
  note("billing", "Plan renews soon", "Your Pro plan renews in 7 days for $199.00", 96, true),
];
