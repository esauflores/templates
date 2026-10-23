import { useQuery } from "@tanstack/react-query";

import { api, call } from "@web/lib/api.ts";
import { cn } from "@web/lib/utils.ts";

/** Whether the API answers its health check, and how fast; checked again every 15 seconds. */
export function ApiStatus() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const started = performance.now();
      await call(api.health.$get());
      return { ms: Math.round(performance.now() - started) };
    },
    refetchInterval: 15_000,
    retry: false,
  });

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1.5 font-mono text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full",
          health.isSuccess && "bg-success",
          health.isError && "bg-destructive",
          health.isPending && "bg-subtle",
        )}
      />
      {health.isSuccess && `api · healthy · ${health.data.ms}ms`}
      {health.isError && "api · offline"}
      {health.isPending && "api · checking"}
    </span>
  );
}
