import { describe, expect, it } from "vitest";

import { currency, daysAgo, fileSize, fmtDate, fromNow } from "./format";

describe("fileSize", () => {
  it("keeps bytes under 1 KiB raw", () => {
    expect(fileSize(0)).toBe("0 B");
    expect(fileSize(1023)).toBe("1023 B");
  });

  it("steps up units and drops the decimal past 10", () => {
    expect(fileSize(1024)).toBe("1.0 KB");
    expect(fileSize(1536)).toBe("1.5 KB");
    expect(fileSize(20 * 1024)).toBe("20 KB");
    expect(fileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(fileSize(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("caps at GB", () => {
    expect(fileSize(2048 * 1024 ** 3)).toBe("2048 GB");
  });
});

describe("currency", () => {
  it("is whole-dollar USD", () => {
    expect(currency(1234.56)).toBe("$1,235");
    expect(currency(0)).toBe("$0");
  });
});

describe("date helpers", () => {
  it("fmtDate renders a stable label", () => {
    // noon UTC so the local-time conversion can't slip a day either direction
    expect(fmtDate("2026-01-05T12:00:00.000Z")).toBe("Jan 5, 2026");
  });

  it("daysAgo returns an ISO string in the past", () => {
    const iso = daysAgo(3);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(iso).getTime()).toBeLessThan(Date.now());
  });

  it("fromNow is suffixed", () => {
    expect(fromNow(daysAgo(2))).toMatch(/ago$/);
  });
});
