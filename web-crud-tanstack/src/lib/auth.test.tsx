import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { signIn, signOut, signUp, useSession } from "./auth";

afterEach(() => act(() => signOut()));

describe("mock auth", () => {
  it("starts signed out", () => {
    const { result } = renderHook(() => useSession());
    expect(result.current).toEqual({ data: null, isPending: false });
  });

  it("signIn sets the session and persists it", async () => {
    const { result } = renderHook(() => useSession());
    await act(() => signIn.email({ email: "ada@x.dev", password: "whatever" }));

    expect(result.current.data?.user).toMatchObject({ email: "ada@x.dev", emailVerified: true });
    expect(localStorage.getItem("web:demo-session")).toContain("ada@x.dev");
  });

  it("signUp keeps the given name", async () => {
    const { result } = renderHook(() => useSession());
    await act(() => signUp.email({ email: "bo@x.dev", password: "pw", name: "Bo" }));
    expect(result.current.data?.user.name).toBe("Bo");
  });

  it("signOut clears session and storage", async () => {
    const { result } = renderHook(() => useSession());
    await act(() => signIn.email({ email: "a@b.c", password: "p" }));
    act(() => signOut());

    expect(result.current.data).toBeNull();
    expect(localStorage.getItem("web:demo-session")).toBeNull();
  });
});
