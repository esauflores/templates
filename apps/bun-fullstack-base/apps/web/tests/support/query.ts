import { QueryClient } from "@tanstack/react-query";

/** A query client for tests: no retries, so an error reaches the screen at once. */
export const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
