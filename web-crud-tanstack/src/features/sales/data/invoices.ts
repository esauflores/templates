import { daysAgo } from "#/lib/format";

export type InvoiceStatus = "paid" | "open" | "overdue";
export type Invoice = {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
};

export const INVOICE_STATUSES: InvoiceStatus[] = ["paid", "open", "overdue"];

let n = 0;
const inv = (customer: string, amount: number, status: InvoiceStatus, due: number): Invoice => {
  n += 1;
  return {
    id: `inv-${n}`,
    number: `INV-${String(2400 + n)}`,
    customer,
    amount,
    status,
    dueDate: daysAgo(due),
  };
};

export const INVOICES: Invoice[] = [
  inv("Acme Inc", 1200, "paid", -6),
  inv("Globex", 249, "open", -3),
  inv("Umbrella Co", 2400, "open", -1),
  inv("Stark Industries", 3600, "paid", 4),
  inv("Hooli", 249, "overdue", 9),
  inv("Wayne Enterprises", 249, "paid", 12),
  inv("Tyrell Corp", 1800, "open", 15),
  inv("Wonka Foods", 249, "overdue", 20),
  inv("Initech", 249, "paid", 24),
  inv("Acme Inc", 1200, "paid", 34),
];
