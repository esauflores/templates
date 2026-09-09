import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

afterEach(() => vi.unstubAllGlobals());

it("subscribes to the media query", () => {
  let matches = false;
  let notify = () => {};
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: () => void) => (notify = listener),
      removeEventListener: vi.fn(),
    })),
  );

  const { result } = renderHook(useIsMobile);
  expect(result.current).toBe(false);

  act(() => {
    matches = true;
    notify();
  });
  expect(result.current).toBe(true);
});
