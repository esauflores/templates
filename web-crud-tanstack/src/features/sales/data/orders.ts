import { daysAgo } from "#/lib/format";

export type OrderStatus = "pending" | "paid" | "shipped" | "refunded";
export type Order = {
  id: string;
  ref: string;
  customer: string;
  total: number;
  status: OrderStatus;
  placedAt: string;
};

export const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "refunded"];

let n = 0;
const o = (customer: string, total: number, status: OrderStatus, placed: number): Order => {
  n += 1;
  return { id: `ord-${n}`, ref: `ORD-${String(8200 + n)}`, customer, total, status, placedAt: daysAgo(placed) };
};

export const ORDERS: Order[] = [
  o("Acme Inc", 1240, "shipped", 1),
  o("Globex", 320, "paid", 2),
  o("Initech", 89, "pending", 2),
  o("Umbrella Co", 4600, "paid", 4),
  o("Hooli", 210, "shipped", 6),
  o("Stark Industries", 7800, "paid", 8),
  o("Wonka Foods", 54, "refunded", 11),
  o("Wayne Enterprises", 430, "shipped", 14),
  o("Cyberdyne", 128, "pending", 18),
  o("Tyrell Corp", 2100, "paid", 25),
];
