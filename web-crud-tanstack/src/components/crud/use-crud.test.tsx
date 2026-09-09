import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCrud } from "./use-crud";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
import { toast } from "sonner";

type Row = { id: string; name: string };
const seed: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bo" },
];

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeEach(() => vi.clearAllMocks());

describe("useCrud", () => {
  it("create prepends optimistically and confirms on persist success", async () => {
    const { result } = renderHook(() => useCrud<Row>(seed, "row"));

    act(() => result.current.create({ name: "Cy" }, "Cy"));
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]).toMatchObject({ name: "Cy" });
    expect(result.current.items[0].id).toBeTruthy();

    await flush();
    expect(toast.success).toHaveBeenCalledWith("Created row “Cy”");
  });

  it("create rolls back and errors when persist rejects", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useCrud<Row>(seed, "row", { persist }));

    act(() => result.current.create({ name: "Cy" }, "Cy"));
    expect(result.current.items).toHaveLength(3);

    await flush();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.map((r) => r.name)).toEqual(["Ada", "Bo"]);
    expect(toast.error).toHaveBeenCalledWith("nope");
  });

  it("remove drops the row and offers Undo", async () => {
    const { result } = renderHook(() => useCrud<Row>(seed, "row"));

    act(() => result.current.remove("a", "Ada"));
    expect(result.current.items).toEqual([{ id: "b", name: "Bo" }]);

    await flush();
    expect(toast.success).toHaveBeenCalledWith(
      "Deleted row “Ada”",
      expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) }),
    );
  });

  it("remove restores the snapshot when persist rejects", async () => {
    const persist = vi.fn().mockRejectedValue("boom");
    const { result } = renderHook(() => useCrud<Row>(seed, "row", { persist }));

    act(() => result.current.remove("a", "Ada"));
    expect(result.current.items).toHaveLength(1);

    await flush();
    expect(result.current.items).toEqual(seed);
    expect(toast.error).toHaveBeenCalledWith("Couldn't delete row “Ada”");
  });

  it("update merges the patch, and reverts the row on failure", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("stale"));
    const { result } = renderHook(() => useCrud<Row>(seed, "row", { persist }));

    act(() => result.current.update("b", { name: "Bobby" }, "Bobby"));
    expect(result.current.items.find((r) => r.id === "b")?.name).toBe("Bobby");

    await flush();
    expect(result.current.items.find((r) => r.id === "b")?.name).toBe("Bo");
    expect(toast.error).toHaveBeenCalledWith("stale");
  });
});
