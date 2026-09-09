import { useSyncExternalStore } from "react";

/**
 * Local mock auth — no backend. Any email/password "works"; the session is
 * kept in localStorage so it survives reloads and syncs across tabs. Swap this
 * file for a real client (Better Auth, your own fetch wrapper, …) and the
 * components that use `useSession` / `signIn` / `signOut` keep working.
 */

type User = { email: string; name: string; emailVerified: boolean };
type Session = { user: User } | null;

const KEY = "web:demo-session";
const subscribers = new Set<() => void>();

let session: Session = null;

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      session = e.newValue ? (JSON.parse(e.newValue) as Session) : null;
    } catch {
      session = null;
    }
    for (const notify of subscribers) notify();
  });
}

const setSession = (next: Session) => {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const notify of subscribers) notify();
};

const subscribe = (cb: () => void) => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

export const useSession = (): { data: Session; isPending: boolean } => {
  // SSR + the first client render return `null` (getServerSnapshot); if a session
  // exists in localStorage, useSyncExternalStore re-renders to it after hydration.
  const data = useSyncExternalStore(
    subscribe,
    () => session,
    () => null,
  );
  return { data, isPending: false };
};

type AuthResult = { error: { message?: string } | null };

export const signIn = {
  email: async ({ email }: { email: string; password: string }): Promise<AuthResult> => {
    setSession({ user: { email, name: email, emailVerified: true } });
    return { error: null };
  },
};

export const signUp = {
  email: async ({ email, name }: { email: string; password: string; name?: string }): Promise<AuthResult> => {
    setSession({ user: { email, name: name || email, emailVerified: true } });
    return { error: null };
  },
};

export const signOut = () => setSession(null);
