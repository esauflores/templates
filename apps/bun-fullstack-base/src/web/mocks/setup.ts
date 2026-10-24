import { afterAll, afterEach, beforeAll } from "vite-plus/test";

import { worker } from "@/web/mocks/worker.ts";

/**
 * Every web test file starts here (vite.config.ts's web project, `setupFiles`): the page's fetch is answered by the
 * handlers of worker.ts, in a service worker, so tests are hermetic and fast, and can answer what the real API never
 * would: a 502, a dropped connection, an offline health check. Unmocked routes answer 500 { error } and show on screen.
 */
beforeAll(() => worker.start({ quiet: true }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
