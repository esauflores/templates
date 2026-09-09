export type ProductStatus = "active" | "draft";
export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  status: ProductStatus;
};

export const PRODUCT_STATUSES: ProductStatus[] = ["active", "draft"];

/** Stock at or below this is flagged low in the table. */
export const LOW_STOCK = 10;

let n = 0;
const p = (sku: string, name: string, price: number, stock: number, status: ProductStatus): Product => ({
  id: `prod-${(n += 1)}`,
  sku,
  name,
  price,
  stock,
  status,
});

export const PRODUCTS: Product[] = [
  p("WID-001", "Standard Widget", 19, 240, "active"),
  p("WID-002", "Pro Widget", 39, 86, "active"),
  p("WID-003", "Widget Refill Pack", 9, 4, "active"),
  p("GAD-010", "Gadget Mini", 49, 31, "active"),
  p("GAD-011", "Gadget Max", 129, 0, "active"),
  p("GAD-012", "Gadget Strap", 12, 7, "active"),
  p("KIT-100", "Starter Kit", 79, 54, "active"),
  p("KIT-101", "Team Kit", 199, 18, "active"),
  p("ACC-200", "Carry Case", 24, 9, "draft"),
  p("ACC-201", "USB Cable", 6, 512, "active"),
  p("ACC-202", "Wall Charger", 18, 63, "draft"),
];
