import { useState } from "react";
import { toast } from "sonner";

import { StatRow } from "#/components/analytics/stats";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { INTEGRATIONS } from "#/features/admin/data/integrations";

export const IntegrationsContent = () => {
  const [items, setItems] = useState(INTEGRATIONS);
  const connected = items.filter((i) => i.connected).length;

  const toggle = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    toast.success(`${target.connected ? "Disconnected" : "Connected"} ${target.name}`);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i)));
  };

  return (
    <div className="flex flex-col gap-6">
      <StatRow
        items={[
          { label: "Available", value: items.length },
          { label: "Connected", value: connected },
          { label: "Categories", value: new Set(items.map((i) => i.category)).size },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Card key={i.id} className="gap-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{i.name}</CardTitle>
                {i.connected ? (
                  <Badge variant="outline" className="gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {i.category}
                  </Badge>
                )}
              </div>
              <CardDescription>{i.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant={i.connected ? "outline" : "default"} onClick={() => toggle(i.id)}>
                {i.connected ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
