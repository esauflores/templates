import { signOut, useSession } from "../lib/auth";

export const Nav = () => {
  const { data: session, isPending } = useSession();

  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <a href="/" className="text-lg font-semibold">
        Web
      </a>
      <div className="flex items-center gap-4 text-sm">
        {isPending ? null : session ? (
          <>
            <a href="/dashboard" className="hover:underline">
              Dashboard
            </a>
            <button type="button" onClick={() => signOut()} className="hover:underline">
              Sign out
            </button>
          </>
        ) : (
          <a href="/sign-in" className="hover:underline">
            Sign in
          </a>
        )}
      </div>
    </nav>
  );
};
