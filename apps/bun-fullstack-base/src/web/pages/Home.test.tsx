import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Home } from "@/web/pages/Home.tsx";
import { type Handler, mockApi } from "@/web/testing.ts";
import { createTestQueryClient } from "@/web/testing.ts";

/** Renders the page with the API mocked; the health check answers unless a test says otherwise. */
function renderHome(handlers: Record<string, Handler>) {
  const calls = mockApi({ "GET /api/health": () => ({ body: { ok: true } }), ...handlers });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Home />
    </QueryClientProvider>,
  );
  return calls;
}

/** The console's answer: its status badge and its body. */
const answer = async (status: string) => ({
  status: await screen.findByText(status),
  body: screen.getByText((_, element) => element?.tagName === "PRE" && element.hasAttribute("aria-live")),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("shows the API's answer, and sends the name from the form (world when empty)", async () => {
    const calls = renderHome({
      "GET /api/hello/world": () => ({ body: { message: "Hello, world!" } }),
      "GET /api/hello/Bun": () => ({ body: { message: "Hello, Bun!" } }),
    });

    expect((await answer("200 OK")).body.textContent).toContain('"message": "Hello, world!"');
    fireEvent.change(screen.getByLabelText(/^name/), { target: { value: "Bun" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByText(/"Hello, Bun!"/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^name/), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByText(/"Hello, world!"/)).toBeTruthy();
    expect(calls.map((call) => call.key).filter((key) => key.includes("hello"))).toEqual([
      "GET /api/hello/world",
      "GET /api/hello/Bun",
      "GET /api/hello/world",
    ]);
  });

  it("shows the API's error, with its status", async () => {
    renderHome({
      "GET /api/hello/world": () => ({ status: 404, statusText: "Not Found", body: { error: "No such greeter" } }),
    });

    expect((await answer("404 Not Found")).body.textContent).toContain('"error": "No such greeter"');
  });

  it("shows the status when an error has no body", async () => {
    renderHome({ "GET /api/hello/world": () => ({ status: 502, statusText: "Bad Gateway" }) });

    expect((await answer("502 Bad Gateway")).body.textContent).toContain('"error": "Bad Gateway"');
  });

  it("shows whether the API answers its health check", async () => {
    renderHome({ "GET /api/hello/world": () => ({ body: { message: "Hello, world!" } }) });
    expect(await screen.findByText(/api · healthy · \d+ms/)).toBeTruthy();

    cleanup();
    renderHome({ "GET /api/health": () => ({ status: 503 }) });
    expect(await screen.findByText("api · offline")).toBeTruthy();
  });
});
