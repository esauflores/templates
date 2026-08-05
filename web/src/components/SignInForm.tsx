import { useState } from "react";

import { signIn, signUp } from "../lib/auth";

type Mode = "signin" | "signup";

export const SignInForm = () => {
  const [mode, setMode] = useState<Mode>("signin");
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

    window.location.href = "/dashboard";
  };

  const isSignin = mode === "signin";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-5 rounded border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex rounded border border-zinc-200 p-1 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${isSignin ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${!isSignin ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"}`}
        >
          Sign up
        </button>
      </div>

      {!isSignin && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Password</span>
          {isSignin && (
            <button
              type="button"
              tabIndex={-1}
              className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
              onClick={() => alert("Password reset flow not implemented in this template.")}
            >
              Forgot password?
            </button>
          )}
        </div>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? (isSignin ? "Signing in..." : "Signing up...") : isSignin ? "Sign in" : "Sign up"}
      </button>
    </form>
  );
};
