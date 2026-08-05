import { useEffect, useState } from "react";

import { authClient, signOut, useSession } from "../lib/auth";

type ApiKey = {
  id: string;
  prefix?: string;
  start?: string;
  name?: string;
  createdAt?: string;
  expiresAt?: string;
};

const formatDate = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (iso: string | undefined) => {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export const DashboardContent = () => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>;
  }

  if (!session) {
    window.location.href = "/sign-in";
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <SessionSection user={session.user} />
      <ApiKeysSection />
    </div>
  );
};

const SessionSection = ({ user }: { user: { email: string; emailVerified: boolean } }) => {
  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">Session</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Logged in as <span className="font-mono">{user.email}</span>
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </div>
      {!user.emailVerified && <ResendVerification email={user.email} />}
    </section>
  );
};

const ResendVerification = ({ email }: { email: string }) => {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setStatus("sending");
    setError(null);
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to resend");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <p>
        <strong>Email not verified.</strong> Check your inbox for the verification link.
      </p>
      <button
        type="button"
        onClick={handleResend}
        disabled={status === "sending" || status === "sent"}
        className="w-fit rounded border border-amber-400 bg-amber-100 px-3 py-1 text-xs hover:bg-amber-200 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/50 dark:hover:bg-amber-900"
      >
        {status === "sending" ? "Sending..." : status === "sent" ? "Sent - check inbox" : "Resend verification email"}
      </button>
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

const ApiKeysSection = () => {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    setError(null);
    try {
      const res = await authClient.apiKey.list();
      if (res.error) {
        setError(res.error.message ?? "Failed to load keys");
        return;
      }
      setKeys((res.data as unknown as { apiKeys: ApiKey[] }).apiKeys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys");
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const deleteKey = async (keyId: string) => {
    if (!confirm("Delete this API key? Any client using it will lose access immediately.")) return;
    try {
      await authClient.apiKey.delete({ keyId });
      await loadKeys();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <button
          type="button"
          onClick={loadKeys}
          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Refresh
        </button>
      </div>
      <CreateKey onCreated={loadKeys} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <KeysTable keys={keys} onDelete={deleteKey} />
    </section>
  );
};

const KeysTable = ({ keys, onDelete }: { keys: ApiKey[] | null; onDelete: (id: string) => void }) => {
  if (keys === null) {
    return <p className="text-sm text-zinc-500">loading...</p>;
  }

  if (keys.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        <em>no keys yet</em>
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-3 font-medium">Prefix</th>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Created</th>
            <th className="py-2 pr-3 font-medium">Expires</th>
            <th className="py-2 font-medium" aria-label="actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {keys.map((k) => (
            <tr key={k.id} className="text-zinc-700 dark:text-zinc-300">
              <td className="py-2 pr-3 font-mono">{k.start ?? k.prefix ?? "—"}</td>
              <td className="py-2 pr-3">{k.name ?? <em className="text-zinc-500">unnamed</em>}</td>
              <td className="py-2 pr-3">{formatDate(k.createdAt)}</td>
              <td className="py-2 pr-3">{formatDateTime(k.expiresAt)}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(k.id)}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CreateKey = ({ onCreated }: { onCreated: () => Promise<void> }) => {
  const [expiresIn, setExpiresIn] = useState<string>("7");
  const [created, setCreated] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setPending(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const body: Record<string, unknown> = { name: "web" };
      if (expiresIn) body.expiresIn = Number(expiresIn) * 86400;
      const res = await authClient.apiKey.create(body as { name: string; expiresIn?: number });
      if (res.error) {
        setError(res.error.message ?? "Failed to create");
        return;
      }
      const key = (res.data as unknown as { key: string }).key;
      setCreated(key);
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setPending(false);
    }
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Copy failed — select and copy manually");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex w-40 flex-col gap-1 text-sm">
          <span>Expires in</span>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">Never</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Creating..." : "Create API key"}
        </button>
      </div>
      {created && (
        <div className="flex items-center gap-2 rounded bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
          <code className="flex-1 break-all font-mono text-amber-900 dark:text-amber-200">{created}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
