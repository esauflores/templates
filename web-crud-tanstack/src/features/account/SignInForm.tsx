import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { signIn, signUp } from "#/lib/auth";

type Mode = "signin" | "signup";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "signin", label: "Sign in" },
  { mode: "signup", label: "Sign up" },
];

export const SignInForm = ({
  initialMode = "signin",
  redirectTo = "/",
}: {
  initialMode?: Mode;
  redirectTo?: string;
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === "signin"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: name || email });

    if (result.error) {
      setError(result.error.message ?? `${mode === "signin" ? "Sign-in" : "Sign-up"} failed`);
      setPending(false);
      return;
    }

    navigate({ to: redirectTo });
  };

  const isSignin = mode === "signin";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="relative flex rounded-md border p-1">
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-sm bg-primary transition-transform duration-200 ease-in-out ${
            isSignin ? "" : "translate-x-full"
          }`}
        />
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => {
              setMode(tab.mode);
              setError(null);
            }}
            className={`relative z-10 flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
              mode === tab.mode ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {!isSignin && (
          <motion.div
            key="name"
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{
              opacity: 1,
              height: "auto",
              overflow: "hidden",
              transitionEnd: { overflow: "visible" },
            }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.2 }}
            className="grid gap-1.5"
          >
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {isSignin && (
            <button
              type="button"
              tabIndex={-1}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => alert("Password reset flow not implemented in this template.")}
            >
              Forgot password?
            </button>
          )}
        </div>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" disabled={pending}>
        {pending ? (isSignin ? "Signing in..." : "Signing up...") : isSignin ? "Sign in" : "Sign up"}
      </Button>
    </form>
  );
};
