export type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    category: "Messaging",
    description: "Post ticket + deploy alerts to a channel.",
    connected: true,
  },
  { id: "github", name: "GitHub", category: "Dev", description: "Link commits and PRs to projects.", connected: true },
  {
    id: "stripe",
    name: "Stripe",
    category: "Billing",
    description: "Sync customers, invoices and payments.",
    connected: true,
  },
  { id: "linear", name: "Linear", category: "Dev", description: "Mirror tickets to Linear issues.", connected: false },
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    description: "Embed design files on project pages.",
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Trigger workflows from any event.",
    connected: false,
  },
  {
    id: "gdrive",
    name: "Google Drive",
    category: "Storage",
    description: "Attach Drive files to records.",
    connected: true,
  },
];
