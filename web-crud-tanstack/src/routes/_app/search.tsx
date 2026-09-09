import { createFileRoute } from "@tanstack/react-router";

import { SearchContent } from "#/features/account/SearchContent";

type SearchParams = { q?: string };

export const Route = createFileRoute("/_app/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Search" }] }),
  component: SearchRoute,
});

function SearchRoute() {
  const { q } = Route.useSearch();
  return <SearchContent q={q ?? ""} />;
}
