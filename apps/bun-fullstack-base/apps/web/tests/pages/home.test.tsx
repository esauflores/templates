import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Home } from "@web/pages/Home.tsx";

import { mockApi } from "../support/fetch.ts";
import { createTestQueryClient } from "../support/query.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("shows the API's greeting, and asks for another on click", async () => {
    const calls = mockApi({
      "GET /api/hello/world": () => ({ body: { message: "Hello, world!" } }),
      "GET /api/hello/Bun": () => ({ body: { message: "Hello, Bun!" } }),
    });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Hello, world!" })).toBeTruthy();
    screen.getByRole("button", { name: "Greet someone else" }).click();
    expect(await screen.findByRole("heading", { name: "Hello, Bun!" })).toBeTruthy();
    expect(calls.map((call) => call.key)).toEqual(["GET /api/hello/world", "GET /api/hello/Bun"]);
  });

  it("shows the API's error", async () => {
    mockApi({ "GET /api/hello/world": () => ({ status: 404, body: { error: "No such greeter" } }) });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("No such greeter")).toBeTruthy();
  });

  it("shows the status when an error has no body", async () => {
    mockApi({ "GET /api/hello/world": () => ({ status: 502 }) });
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Home />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Request failed (502)")).toBeTruthy();
  });
});
