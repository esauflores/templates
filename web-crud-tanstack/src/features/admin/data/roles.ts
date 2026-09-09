import { type Role, ROLES } from "./team";

export type Permission = { id: string; label: string; group: string };

export const PERMISSIONS: Permission[] = [
  { id: "projects.read", label: "View projects", group: "Projects" },
  { id: "projects.write", label: "Create & edit projects", group: "Projects" },
  { id: "projects.delete", label: "Delete projects", group: "Projects" },
  { id: "billing.read", label: "View invoices & orders", group: "Billing" },
  { id: "billing.write", label: "Create & edit invoices", group: "Billing" },
  { id: "billing.refund", label: "Issue refunds", group: "Billing" },
  { id: "team.read", label: "View team", group: "Team" },
  { id: "team.invite", label: "Invite & remove members", group: "Team" },
  { id: "team.roles", label: "Change roles & permissions", group: "Team" },
  { id: "settings.keys", label: "Manage API keys", group: "Settings" },
];

/** Default grant per role — `owner` implicitly has everything. */
export const DEFAULT_GRANTS: Record<Role, string[]> = {
  owner: PERMISSIONS.map((p) => p.id),
  admin: [
    "projects.read",
    "projects.write",
    "projects.delete",
    "billing.read",
    "billing.write",
    "team.read",
    "team.invite",
    "settings.keys",
  ],
  member: ["projects.read", "projects.write", "billing.read", "team.read"],
};

export { ROLES, type Role };
