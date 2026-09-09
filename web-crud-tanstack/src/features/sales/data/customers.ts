import { daysAgo } from "#/lib/format";

export type Plan = "free" | "pro" | "enterprise";
export type Customer = {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  mrr: number;
  /** El Salvador department — matches a `name` in `sv-departments.ts` (used by the Reports map). */
  department: string;
  createdAt: string;
};

export const PLANS: Plan[] = ["free", "pro", "enterprise"];

let n = 0;
const c = (name: string, plan: Plan, mrr: number, department: string, created: number): Customer => ({
  id: `cust-${(n += 1)}`,
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
  plan,
  mrr,
  department,
  createdAt: daysAgo(created),
});

export const CUSTOMERS: Customer[] = [
  c("Acme Inc", "enterprise", 1200, "San Salvador", 2),
  c("Globex", "pro", 249, "La Libertad", 4),
  c("Initech", "pro", 249, "Santa Ana", 6),
  c("Umbrella Co", "enterprise", 2400, "San Salvador", 9),
  c("Hooli", "pro", 249, "San Miguel", 12),
  c("Stark Industries", "enterprise", 3600, "La Libertad", 16),
  c("Wayne Enterprises", "pro", 249, "Sonsonate", 20),
  c("Soylent Corp", "free", 0, "San Salvador", 24),
  c("Wonka Foods", "pro", 249, "Ahuachapán", 27),
  c("Cyberdyne", "free", 0, "La Paz", 33),
  c("Tyrell Corp", "enterprise", 1800, "Santa Ana", 40),
  c("Pied Piper", "free", 0, "San Salvador", 45),
];
