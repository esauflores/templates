import { isSameWeek, startOfWeek, subWeeks } from "date-fns";

const MONDAY = { weekStartsOn: 1 } as const;

/**
 * Bucket items (by an ISO-date accessor) into the last `weeks` calendar weeks.
 * `count` is the item tally, or the sum of `amountOf` when given (e.g. revenue).
 */
export const weekly = <T>(
  items: T[],
  dateOf: (item: T) => string,
  { weeks = 8, amountOf }: { weeks?: number; amountOf?: (item: T) => number } = {},
) => {
  const thisWeek = startOfWeek(new Date(), MONDAY);
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    date: subWeeks(thisWeek, weeks - 1 - i).toISOString(),
    count: 0,
  }));
  for (const item of items) {
    const when = new Date(dateOf(item));
    const bucket = buckets.find((b) => isSameWeek(new Date(b.date), when, MONDAY));
    if (bucket) bucket.count += amountOf ? amountOf(item) : 1;
  }
  return buckets;
};
