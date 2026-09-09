import { daysAgo } from "#/lib/format";

export type Meter = { label: string; used: number; limit: number; unit?: string };

export const BILLING = {
  plan: "Pro",
  seats: 8,
  amount: 199,
  interval: "month",
  renewsAt: daysAgo(-23),
  card: { brand: "Visa", last4: "4242", exp: "08 / 27" },
};

export const METERS: Meter[] = [
  { label: "Seats", used: 8, limit: 10 },
  { label: "API calls", used: 82_400, limit: 100_000 },
  { label: "Storage", used: 6.2, limit: 10, unit: "GB" },
  { label: "Projects", used: 12, limit: 25 },
];
