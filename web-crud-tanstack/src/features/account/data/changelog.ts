import { daysAgo } from "#/lib/format";

export type ChangeType = "added" | "improved" | "fixed";
export type ChangelogEntry = {
  version: string;
  date: string;
  changes: { type: ChangeType; text: string }[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: daysAgo(2),
    changes: [
      { type: "added", text: "Board view — drag tickets between columns" },
      { type: "added", text: "El Salvador customer map on Reports" },
      { type: "improved", text: "Command menu now jumps to individual customers" },
    ],
  },
  {
    version: "1.3.0",
    date: daysAgo(16),
    changes: [
      { type: "added", text: "Files browser with breadcrumb folders" },
      { type: "added", text: "Roles & permissions matrix" },
      { type: "fixed", text: "Sidebar active state on nested routes" },
    ],
  },
  {
    version: "1.2.1",
    date: daysAgo(31),
    changes: [
      { type: "fixed", text: "Chart tooltips clipped inside cards" },
      { type: "improved", text: "Faster first paint for the overview page" },
    ],
  },
  {
    version: "1.2.0",
    date: daysAgo(48),
    changes: [
      { type: "added", text: "Per-customer detail page with related records" },
      { type: "added", text: "Reports: weekly trend charts" },
    ],
  },
  {
    version: "1.1.0",
    date: daysAgo(70),
    changes: [
      { type: "added", text: "Invoices and Products resources" },
      { type: "improved", text: "Compact KPI cards" },
    ],
  },
];
