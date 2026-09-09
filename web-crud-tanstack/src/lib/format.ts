import { format, formatDistanceToNowStrict, subDays } from "date-fns";

export const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string) => format(new Date(iso), "MMM d, yyyy");

export const daysAgo = (n: number) => subDays(new Date(), n).toISOString();

/** "3 minutes ago" / "5 hours ago" / "2 days ago". */
export const fromNow = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

export const fileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
};
