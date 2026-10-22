import type { HTMLBundle } from "bun";

/** Hashed files change name when their content does, so browsers may keep them; index.html is checked every time. */
const HASHED = "public, max-age=31536000, immutable";
const REVALIDATE = "no-cache";

/**
 * The web app's routes for Bun.serve. In dev, the page is Bun's to bundle as it's requested. Built ahead of time
 * (build.ts), it lists its files in dist/ instead: each is read once here and answered from memory, as Bun would
 * otherwise read the file again on every request. index.html answers every other path, so client-side routes load.
 */
export async function pageRoutes(page: HTMLBundle): Promise<Record<string, HTMLBundle | Response>> {
  if (!page.files) return { "/*": page };

  const routes: Record<string, Response> = {};
  for (const file of page.files) {
    const isPage = file.loader === "html";
    const headers = { ...file.headers, "cache-control": isPage ? REVALIDATE : HASHED };
    routes[isPage ? "/*" : `/${file.path.replace(/^\.\//, "")}`] = new Response(await Bun.file(file.path).bytes(), {
      headers,
    });
  }
  return routes;
}
