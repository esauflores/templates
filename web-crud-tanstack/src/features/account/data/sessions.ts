import { daysAgo } from "#/lib/format";

export type DeviceSession = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActiveAt: string;
  current: boolean;
};

export const SESSIONS: DeviceSession[] = [
  {
    id: "s1",
    device: "MacBook Pro",
    browser: "Chrome 141",
    location: "San Salvador, SV",
    lastActiveAt: daysAgo(0),
    current: true,
  },
  {
    id: "s2",
    device: "iPhone 15",
    browser: "Safari",
    location: "San Salvador, SV",
    lastActiveAt: daysAgo(0.3),
    current: false,
  },
  {
    id: "s3",
    device: "Windows PC",
    browser: "Edge 140",
    location: "Austin, US",
    lastActiveAt: daysAgo(4),
    current: false,
  },
  {
    id: "s4",
    device: "iPad Air",
    browser: "Safari",
    location: "Mexico City, MX",
    lastActiveAt: daysAgo(19),
    current: false,
  },
];
