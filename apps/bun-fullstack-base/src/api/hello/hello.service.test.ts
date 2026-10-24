import { describe, expect, it } from "vite-plus/test";

import { greet } from "./hello.service.ts";

describe("greet", () => {
  it("greets by name", () => {
    expect(greet("Ada")).toEqual({ message: "Hello, Ada!" });
  });
});
