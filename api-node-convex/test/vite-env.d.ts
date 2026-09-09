// `test/harness.ts` loads every Convex function module via Vite's
// `import.meta.glob`. Vitest supplies it at runtime; this is the minimal type
// (the full `vite/client` types aren't installed as a direct dependency).
//
// The array overload is what allows the `["/convex/**/*.ts", "!…"]` form.
interface ImportMeta {
  glob: (pattern: string | string[]) => Record<string, () => Promise<unknown>>;
}
