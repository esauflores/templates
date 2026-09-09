import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "#/components/crud/data-table";
import { DeleteButton } from "#/components/crud/row-actions";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { UserAvatar } from "#/components/ui/user-avatar";
import { SESSIONS } from "#/features/account/data/sessions";
import { useSession } from "#/lib/auth";
import { fromNow } from "#/lib/format";

export const AccountContent = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name ?? "");
  const [sessions, setSessions] = useState(SESSIONS);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Local mock — wire these to your API in <code>src/lib/auth.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={name || user?.name} email={user?.email} className="size-12 rounded-full text-sm" />
            <Button size="sm" variant="outline">
              Change avatar
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="account-name">Name</Label>
            <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" readOnly value={user?.email ?? "not signed in"} />
          </div>
          <Button
            size="sm"
            className="w-fit"
            disabled={!name.trim() || name === user?.name}
            onClick={() => toast.success("Profile saved")}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={() => toast("Password reset link sent")}>
            Send reset link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices signed in to this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={sessions}
            empty="No other sessions."
            head={
              <>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </>
            }
            render={(s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <span className="font-medium">{s.device}</span>
                  <span className="text-muted-foreground"> · {s.browser}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.location}</TableCell>
                <TableCell className="text-muted-foreground">{s.current ? "now" : fromNow(s.lastActiveAt)}</TableCell>
                <TableCell className="text-right">
                  {s.current ? (
                    <Badge variant="outline">This device</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSessions((prev) => prev.filter((x) => x.id !== s.id));
                        toast.success(`Signed out ${s.device}`);
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Deleting your account is permanent.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteButton
            label="your account"
            onConfirm={() => toast.error("Account deletion is disabled in the demo")}
          />
        </CardContent>
      </Card>
    </div>
  );
};
