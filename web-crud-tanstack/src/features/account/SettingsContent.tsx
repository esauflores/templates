import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "#/components/crud/data-table";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { useSession } from "#/lib/auth";
import { fmtDate } from "#/lib/format";

type ApiKey = { id: string; start: string; name: string; createdAt: string; expiresAt: string | null };

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const now = Date.now();

const SEED_KEYS: ApiKey[] = [
  { id: "k1", start: "sk_live_9f2a…", name: "production", createdAt: iso(now - 12 * DAY), expiresAt: null },
  { id: "k2", start: "sk_live_4c81…", name: "ci", createdAt: iso(now - 3 * DAY), expiresAt: iso(now + 27 * DAY) },
];

const randomKey = () => `sk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;

export const SettingsContent = () => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <ProfileCard />
    <ApiKeysCard />
  </div>
);

const ProfileCard = () => {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <div className="grid gap-1.5">
        <Label className="text-xs">Name</Label>
        <Input readOnly value={user?.name ?? "—"} />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">Email</Label>
        <Input readOnly value={user?.email ?? "not signed in"} />
      </div>
      <p className="text-xs text-muted-foreground">
        Read-only in this demo — profile lives with the mock session in <code>src/lib/auth.ts</code>.
      </p>
    </Card>
  );
};

const ApiKeysCard = () => {
  const [keys, setKeys] = useState<ApiKey[]>(SEED_KEYS);
  const [expiresIn, setExpiresIn] = useState("30");
  const [created, setCreated] = useState<string | null>(null);

  const create = () => {
    const full = randomKey();
    setKeys((prev) => [
      {
        id: crypto.randomUUID(),
        start: `${full.slice(0, 12)}…`,
        name: "web",
        createdAt: iso(Date.now()),
        expiresAt: expiresIn === "0" ? null : iso(Date.now() + Number(expiresIn) * DAY),
      },
      ...prev,
    ]);
    setCreated(full);
    toast.success("API key created");
  };

  const remove = (id: string) => {
    if (!confirm("Delete this API key? Anything using it loses access immediately.")) return;
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key deleted");
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">API Keys</h2>

      <Card className="flex flex-col gap-2 p-3 shadow-none">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-40 gap-1">
            <Label className="text-xs">Expires in</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="0">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={create}>
            Create API key
          </Button>
        </div>
        {created && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-xs dark:bg-amber-950/40">
            <code className="flex-1 font-mono break-all text-amber-900 dark:text-amber-200">{created}</code>
            <Button type="button" variant="outline" size="xs" onClick={copy}>
              Copy
            </Button>
          </div>
        )}
      </Card>

      <DataTable
        rows={keys}
        empty="No API keys yet."
        head={
          <>
            <TableHead>Prefix</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        }
        render={(k) => (
          <TableRow key={k.id}>
            <TableCell className="font-mono">{k.start}</TableCell>
            <TableCell>{k.name}</TableCell>
            <TableCell>{fmtDate(k.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">{k.expiresAt ? fmtDate(k.expiresAt) : "never"}</TableCell>
            <TableCell className="text-right">
              <Button type="button" variant="destructive" size="xs" onClick={() => remove(k.id)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        )}
      />
    </Card>
  );
};
