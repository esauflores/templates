import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Zap } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ApiStatus } from "@web/components/ApiStatus.tsx";
import { ThemeToggle } from "@web/components/ThemeToggle.tsx";
import { api, ApiError, call } from "@web/lib/api.ts";
import { cn } from "@web/lib/utils.ts";

/** What the template is made of, for "What's inside". */
const STACK = [
  { tag: "runtime", name: "Bun", role: "Runs the server and bundles the page." },
  { tag: "api", name: "Hono + Zod OpenAPI", role: "Validated, self-documenting routes." },
  { tag: "ui", name: "React 19 + React Router", role: "The page and its routes." },
  { tag: "data", name: "TanStack Query", role: "API data, cached and refetched." },
  { tag: "style", name: "Tailwind CSS 4 + shadcn/ui", role: "Theme tokens and components." },
  { tag: "tooling", name: "Vite+", role: "Format, lint, type-check and test." },
];

/** The API's endpoints, for "Endpoints". */
const ENDPOINTS = [
  { path: "/api/hello/{name}", href: "/api/hello/world", description: "Greeting for a name. Validated by Zod." },
  { path: "/api/health", href: "/api/health", description: "Liveness check used by the status pill." },
  {
    path: "/api/openapi.json",
    href: "/api/openapi.json",
    description: "OpenAPI 3.1 document generated from the schemas.",
  },
];

const NAV = [
  { href: "#try", label: "Try it" },
  { href: "#stack", label: "Stack" },
  { href: "#api", label: "API" },
];

/** The landing page: what the template is, a live console on its API, its stack and its endpoints. */
export function Home() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-6 px-6 py-3.5">
          <a href="#top" className="flex items-center gap-2.5 text-[15px] font-semibold">
            <span className="grid size-7 place-items-center rounded-[7px] bg-brand text-brand-foreground">
              <Zap className="size-4" strokeWidth={2.4} />
            </span>
            Bun fullstack base
          </a>
          <nav aria-label="Primary" className="flex flex-auto flex-wrap gap-1">
            {NAV.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <ApiStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="top">
        <section id="try" className="mx-auto flex max-w-300 flex-wrap items-center gap-14 px-6 pt-14 pb-10">
          <div className="min-w-0 flex-[1_1_480px]">
            <p className="mb-5 font-mono text-[13px] tracking-[0.02em] text-brand-text">bun · hono · zod · react</p>
            <h1 className="text-[clamp(40px,5.2vw,64px)] leading-[1.02] font-bold tracking-[-0.035em]">
              One process.
              <br />
              Typed end to end.
            </h1>
            <p className="mt-6 max-w-115 text-lg leading-[1.55] text-muted-foreground">
              A Hono API and a React app served by one Bun server. Zod schemas validate every request, generate the
              OpenAPI document, and type the client: change a schema and the UI fails to compile, not in production.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/api/openapi.json"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4.5 text-[15px] font-semibold text-brand-foreground"
              >
                API reference <ArrowRight className="size-4" />
              </a>
              <CopyCommand command="bun run dev" />
            </div>
          </div>
          <Console />
        </section>

        <section id="stack" aria-labelledby="stack-heading" className="border-y bg-muted">
          <div className="mx-auto max-w-300 px-6 py-9">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="stack-heading" className="text-[22px] font-semibold tracking-[-0.02em]">
                What's inside
              </h2>
              <p className="text-sm text-subtle">One repo, three workspaces.</p>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {STACK.map(({ tag, name, role }) => (
                <li key={name} className="flex flex-col gap-0.5 bg-card px-5 py-4">
                  <span className="font-mono text-xs text-brand-text">{tag}</span>
                  <span className="text-[17px] font-semibold">{name}</span>
                  <span className="text-sm text-muted-foreground">{role}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="api" aria-labelledby="api-heading" className="mx-auto max-w-300 px-6 pt-9 pb-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <h2 id="api-heading" className="text-[28px] font-semibold tracking-[-0.02em]">
              Endpoints
            </h2>
            <a href="/api/openapi.json" className="text-sm text-muted-foreground underline hover:text-foreground">
              Full OpenAPI document →
            </a>
          </div>
          <ul className="divide-y overflow-x-auto rounded-xl border">
            {ENDPOINTS.map(({ path, href, description }) => (
              <li key={path}>
                <a href={href} className="flex min-h-11 flex-wrap items-center gap-4 px-5 py-4.5 hover:bg-muted">
                  <span className="w-11 rounded-md bg-secondary py-0.5 text-center font-mono text-xs text-success">
                    GET
                  </span>
                  <span className="flex-[0_1_260px] font-mono text-sm">{path}</span>
                  <span className="flex-[1_1_240px] text-sm text-muted-foreground">{description}</span>
                  <ArrowUpRight className="size-4 text-subtle" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-300 flex-wrap justify-between gap-3 p-6 text-[13px] text-subtle">
          <span>Bun fullstack base</span>
          <span className="font-mono">vite+ · format · lint · typecheck · test</span>
        </div>
      </footer>
    </div>
  );
}

/** A shell command, with a button that copies it. */
function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${command}`}
      className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-edge bg-card px-4 font-mono text-sm"
    >
      <span className="text-subtle">$</span>
      {command}
      <span className="font-sans text-xs text-subtle">{copied ? "copied" : "copy"}</span>
    </button>
  );
}

/** One request and its answer, as the console shows it: an error is an answer too. */
interface Exchange {
  status: number;
  statusText: string;
  body: unknown;
  ms: number;
}

/** Asks the API to greet a name, timing it. The client doesn't URL-encode, so the name is encoded here. */
async function greet(name: string): Promise<Exchange> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    const body = await call(api.hello[":name"].$get({ param: { name: encodeURIComponent(name) } }));
    return { status: 200, statusText: "OK", body, ms: elapsed() };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { status: error.status, statusText: error.statusText, body: { error: error.message }, ms: elapsed() };
  }
}

/** A live console on GET /api/hello/{name}: the typed call, a form for the name, and the API's real answer. */
function Console() {
  const [draft, setDraft] = useState("world");
  const [name, setName] = useState("world");
  const hello = useQuery({ queryKey: ["hello", name], queryFn: () => greet(name), placeholderData: keepPreviousData });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setName(draft.trim() || "world");
  };

  return (
    <div className="min-w-0 flex-[1_1_460px] overflow-hidden rounded-2xl border border-edge bg-card">
      <div className="border-b px-4 py-3 font-mono text-xs text-subtle">hc&lt;AppType&gt; · typed RPC client</div>
      <pre className="border-b px-5 py-3 font-mono text-[13px] leading-relaxed wrap-anywhere whitespace-pre-wrap text-code">
        api.hello[<span className="text-code-string">":name"</span>].$get({"{ param: { name: "}
        <span className="text-code-string">"{name}"</span>
        {" } })"}
      </pre>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5 border-b px-5 py-3">
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor="name" className="text-[13px] text-muted-foreground">
            name <span className="font-mono text-subtle">z.string().min(1).max(50)</span>
          </label>
          <input
            id="name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            placeholder="world"
            className="h-11 rounded-lg border border-input bg-background px-3.5 font-mono text-sm outline-ring placeholder:text-subtle focus:outline-2 focus:outline-offset-1"
          />
        </div>
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Send request
        </button>
      </form>
      <div
        aria-busy={hello.isFetching}
        className={cn(
          "flex flex-col gap-2.5 px-5 pt-3 pb-4 transition-opacity",
          hello.isPlaceholderData && "opacity-50",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded-md bg-secondary px-2 py-0.5">GET</span>
          <span className="wrap-anywhere text-code">/api/hello/{encodeURIComponent(name)}</span>
          <span className="flex-auto" />
          {hello.data && (
            <>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5",
                  hello.data.status < 400 ? "bg-success-muted text-success" : "bg-destructive-muted text-destructive",
                )}
              >
                {hello.data.status} {hello.data.statusText}
              </span>
              <span className="text-subtle">{hello.data.ms} ms</span>
            </>
          )}
        </div>
        <pre
          aria-live="polite"
          className="min-h-21.5 rounded-lg border bg-background px-3.5 py-2.5 font-mono text-[13px] leading-relaxed wrap-anywhere whitespace-pre-wrap text-code"
        >
          {hello.data ? JSON.stringify(hello.data.body, null, 2) : "…"}
        </pre>
      </div>
    </div>
  );
}
