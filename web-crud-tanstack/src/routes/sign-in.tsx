import { createFileRoute, Link } from "@tanstack/react-router";

import { SignInForm } from "#/features/account/SignInForm";

type SignInSearch = { mode?: "signup"; redirect?: string };

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    ...(search.mode === "signup" ? { mode: "signup" as const } : {}),
    // only same-origin paths — guards against open redirects
    ...(typeof search.redirect === "string" && search.redirect.startsWith("/") ? { redirect: search.redirect } : {}),
  }),
  head: ({ match }) => ({
    meta: [{ title: match.search.mode === "signup" ? "Create account" : "Sign in" }],
  }),
  component: SignInRoute,
});

const Brand = ({ className }: { className?: string }) => (
  <Link to="/" className={`flex items-center gap-2 text-sm font-semibold ${className ?? ""}`}>
    <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">W</span>
    Web CRUD
  </Link>
);

function SignInRoute() {
  const { mode, redirect } = Route.useSearch();
  const signup = mode === "signup";

  return (
    <div className="grid min-h-svh lg:grid-cols-3">
      <aside
        className="relative hidden overflow-hidden bg-neutral-950 lg:col-span-2 lg:block"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 15%, oklch(0.55 0.16 264 / 0.45), transparent 55%), radial-gradient(circle at 85% 90%, oklch(0.5 0.13 300 / 0.35), transparent 55%)",
        }}
      >
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <Brand className="text-white" />
          <blockquote className="max-w-lg">
            <p className="text-2xl leading-snug font-medium text-balance">
              “A dashboard starter you can actually ship — sidebar, four CRUD resources, and an overview, wired to
              swappable mocks.”
            </p>
            <footer className="mt-4 text-sm text-white/70">The README, probably</footer>
          </blockquote>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10 lg:col-span-1">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Brand className="lg:hidden" />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {signup ? "Create your account" : "Sign in to Web CRUD"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {signup ? "Any email and password works — it's a demo." : "Welcome back. Any credentials work here."}
            </p>
          </div>
          <SignInForm initialMode={signup ? "signup" : "signin"} redirectTo={redirect} />
        </div>
      </main>
    </div>
  );
}
