import { QueryClient } from "@tanstack/react-query";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // a dashboard tolerates minute-old data; tune per query
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

let browser: QueryClient | undefined;

/** One client per SSR request; a singleton in the browser. */
export function getQueryClient(): QueryClient {
  if (typeof document === "undefined") return makeQueryClient();
  browser ??= makeQueryClient();
  return browser;
}
