import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { cn } from "#/lib/utils";

const STEPS = [
  { id: "team", title: "Invite your team", body: "Add teammates and set their roles.", to: "/team" },
  { id: "customer", title: "Add a customer", body: "Create your first customer record.", to: "/customers" },
  { id: "project", title: "Start a project", body: "Track work on the board.", to: "/board" },
  { id: "integration", title: "Connect an integration", body: "Wire up Slack, GitHub or Stripe.", to: "/integrations" },
  { id: "invoice", title: "Send an invoice", body: "Bill a customer for the work.", to: "/invoices" },
  { id: "keys", title: "Create an API key", body: "Set up programmatic access.", to: "/settings" },
] as const;

const KEY = "web:onboarding-done";
const load = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};

export const GettingStartedContent = () => {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => setDone(load()), []);

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const pct = Math.round((done.length / STEPS.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {done.length} of {STEPS.length} done
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const checked = done.includes(step.id);
          return (
            <Card key={step.id} className="flex-row items-center gap-4 p-4">
              <button
                type="button"
                onClick={() => toggle(step.id)}
                aria-pressed={checked}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  checked ? "border-primary bg-primary text-primary-foreground" : "text-transparent",
                )}
              >
                <Check className="size-3.5" />
              </button>
              <CardContent className="flex flex-1 flex-col gap-0.5 p-0">
                <span className={cn("text-sm font-medium", checked && "text-muted-foreground line-through")}>
                  {step.title}
                </span>
                <span className="text-sm text-muted-foreground">{step.body}</span>
              </CardContent>
              <Button asChild size="sm" variant="outline">
                <Link to={step.to}>Open</Link>
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
