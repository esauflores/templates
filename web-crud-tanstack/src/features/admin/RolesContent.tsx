import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { DEFAULT_GRANTS, PERMISSIONS, ROLES } from "#/features/admin/data/roles";

type Grants = Record<string, string[]>;

const norm = (g: Grants) => ROLES.map((r) => `${r}:${[...g[r]].sort().join(",")}`).join("|");

const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export const RolesContent = () => {
  const saved = useRef<Grants>(structuredClone(DEFAULT_GRANTS));
  const [grants, setGrants] = useState<Grants>(() => structuredClone(DEFAULT_GRANTS));
  const dirty = norm(grants) !== norm(saved.current);

  const toggle = (role: string, id: string) =>
    setGrants((prev) => {
      const has = prev[role].includes(id);
      return { ...prev, [role]: has ? prev[role].filter((x) => x !== id) : [...prev[role], id] };
    });

  const save = () => {
    saved.current = structuredClone(grants);
    setGrants(structuredClone(grants));
    toast.success("Permissions saved");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setGrants(structuredClone(saved.current))}
          disabled={!dirty}
        >
          Reset
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!dirty}>
          Save changes
        </Button>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group}</CardTitle>
            <CardDescription>Which roles can do what</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="w-24 py-2 text-center font-medium capitalize">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.filter((p) => p.group === group).map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{p.label}</td>
                    {ROLES.map((role) => (
                      <td key={role} className="text-center">
                        <Checkbox
                          className="mx-auto"
                          checked={grants[role].includes(p.id)}
                          disabled={role === "owner"}
                          onCheckedChange={() => toggle(role, p.id)}
                          aria-label={`${role} — ${p.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">
        Owner keeps every permission. Changes here live in component state — wire <code>save()</code> to your API.
      </p>
    </div>
  );
};
