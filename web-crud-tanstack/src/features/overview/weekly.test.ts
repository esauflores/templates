import { subWeeks } from "date-fns";
import { describe, expect, it } from "vitest";

import { weekly } from "./weekly";

const at = (d: Date) => ({ when: d.toISOString() });

describe("weekly", () => {
  it("returns one ascending bucket per week", () => {
    const b = weekly([], (x: { when: string }) => x.when, { weeks: 6 });
    expect(b).toHaveLength(6);
    expect(b.map((x) => x.count)).toEqual([0, 0, 0, 0, 0, 0]);
    const times = b.map((x) => new Date(x.date).getTime());
    expect(times).toEqual([...times].sort((a, z) => a - z));
  });

  it("tallies items into the matching week, ignoring older ones", () => {
    const now = new Date();
    const items = [at(now), at(now), at(subWeeks(now, 2)), at(subWeeks(now, 9))];
    const b = weekly(items, (x) => x.when, { weeks: 4 });
    expect(b.at(-1)?.count).toBe(2); // this week
    expect(b.at(-3)?.count).toBe(1); // two weeks back
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(3); // the 9-weeks-ago item falls outside
  });

  it("sums amountOf instead of counting when given", () => {
    const now = new Date();
    const items = [
      { when: now.toISOString(), total: 10 },
      { when: now.toISOString(), total: 5 },
    ];
    const b = weekly(items, (x) => x.when, { weeks: 3, amountOf: (x) => x.total });
    expect(b.at(-1)?.count).toBe(15);
  });
});
