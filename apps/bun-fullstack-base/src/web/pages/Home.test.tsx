import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { worker } from "@/web/mocks/worker.ts";
import { Home } from "@/web/pages/Home.tsx";

/**
 * The page, against the handlers of mocks/worker.ts (MSW, in the browser): the health check and the greeting answer as the API
 * would, and a test overrides one of them for what the real API never answers (a 502, a health check that's down).
 * Retries are off, so an error reaches the screen at once.
 */
function renderHome() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Home />
    </QueryClientProvider>,
  );
}

/** The console's answer: its status badge and its body. */
const answer = async (status: string) => ({
  status: await screen.findByText(status),
  body: screen.getByText((_, element) => element?.tagName === "PRE" && element.hasAttribute("aria-live")),
});

/** Types a name and sends it. */
const send = (name: string) => {
  fireEvent.change(screen.getByLabelText(/^name/), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Send request" }));
};

afterEach(cleanup);

describe("Home", () => {
  it("shows the API's answer, and sends the name from the form (world when empty)", async () => {
    renderHome();
    expect((await answer("200 OK")).body.textContent).toContain('"Hello, world!"');

    send("Bun");
    expect(await screen.findByText(/"Hello, Bun!"/)).toBeTruthy();

    send(" ");
    expect(await screen.findByText(/"Hello, world!"/)).toBeTruthy();
  });

  it("shows the API's error, with its status and its message", async () => {
    worker.use(
      http.get("/api/hello/world", () =>
        HttpResponse.json({ error: "No such greeter" }, { status: 404, statusText: "Not Found" }),
      ),
    );
    renderHome();

    expect((await answer("404 Not Found")).body.textContent).toContain('"error": "No such greeter"');
  });

  it("shows the status when an error has no body", async () => {
    worker.use(http.get("/api/hello/world", () => new HttpResponse(null, { status: 502, statusText: "Bad Gateway" })));
    renderHome();

    expect((await answer("502 Bad Gateway")).body.textContent).toContain('"error": "Bad Gateway"');
  });

  it("shows whether the API answers its health check", async () => {
    renderHome();
    expect(await screen.findByText(/api · healthy · \d+ms/)).toBeTruthy();

    cleanup();
    worker.use(http.get("/api/health", () => new HttpResponse(null, { status: 503 })));
    renderHome();
    expect(await screen.findByText("api · offline")).toBeTruthy();
  });
});
