import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@web/components/ui/button.tsx";
import { api, call } from "@web/lib/api.ts";

/** Greets a name through the API; the button switches names. The name is URL-encoded, as the client doesn't. */
export function Home() {
  const [name, setName] = useState("world");
  const hello = useQuery({
    queryKey: ["hello", name],
    queryFn: () => call(api.hello[":name"].$get({ param: { name: encodeURIComponent(name) } })),
  });

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{hello.data?.message ?? "…"}</h1>
      {hello.error && <p className="text-sm text-destructive">{hello.error.message}</p>}
      <Button variant="outline" onClick={() => setName(name === "world" ? "Bun" : "world")}>
        Greet someone else
      </Button>
    </main>
  );
}
