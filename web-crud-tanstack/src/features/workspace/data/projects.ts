import { daysAgo } from "#/lib/format";

export type ProjectStatus = "active" | "paused" | "archived";
export type Project = { id: string; name: string; status: ProjectStatus; updatedAt: string };

export const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "archived"];

let n = 0;
const p = (name: string, status: ProjectStatus, updated: number): Project => ({
  id: `proj-${(n += 1)}`,
  name,
  status,
  updatedAt: daysAgo(updated),
});

export const PROJECTS: Project[] = [
  p("Marketing site", "active", 0),
  p("Checkout redesign", "active", 1),
  p("Billing service", "active", 2),
  p("Mobile app", "paused", 4),
  p("Search revamp", "active", 5),
  p("Data pipeline", "active", 6),
  p("Onboarding flow", "paused", 9),
  p("Admin console", "active", 11),
  p("Webhooks v2", "paused", 12),
  p("Legacy import", "archived", 30),
  p("Reporting", "archived", 33),
  p("Internal tools", "paused", 41),
];
