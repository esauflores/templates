import { Database } from "bun:sqlite";
import { rmSync } from "node:fs";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The HTTP benchmark behind the README's table: [oha](https://github.com/hatoo/oha) loads the built server (dist/) per
 * route, ROUNDS rounds each, on a fresh server and a copy of a database of NOTES notes. `bun run bench` builds first.
 * - Each route also runs behind Caddy compressing the answers, as in production.
 * - The server and proxy are pinned to their own CPUs (taskset, Linux), and the rate limit is off.
 * - Run it on a quiet machine on a performance power profile: a power-saving one halves every number.
 */
const ROUNDS = 3;
const NOTES = 1_000_000;
const SECONDS = 5;
const CONNECTIONS = 100;
const PORT = 3130;
const PROXY_PORT = 3131;
const SERVER_CPU = "1";
const PROXY_CPUS = "0,4";
const LOAD_CPUS = "2,3,6,7";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** One row of the table: what to request, and how. */
interface Target {
  label: string;
  method: "GET" | "POST";
  path: string;
  body?: string;
}

/** What oha reports for one round, the parts the table shows. */
interface Round {
  rps: number;
  p99Ms: number;
  readyMs: number;
  errors: number;
}

/**
 * Runs a command, with its CPUs pinned when taskset is there. Only oha's output is read: the server's request log is
 * dropped, as a pipe nobody reads would fill and stall it.
 */
function spawn(
  cmd: string[],
  cpus: string,
  { env = {}, read = false }: { env?: Record<string, string>; read?: boolean },
) {
  const pinned = Bun.which("taskset") ? ["taskset", "-c", cpus, ...cmd] : cmd;
  const output = read ? "pipe" : "ignore";
  return Bun.spawn(pinned, { cwd: dist, env: { ...process.env, ...env }, stdout: output, stderr: "ignore" });
}

/** Waits for the server (or Caddy) to answer its health check, and answers how long that took from `since`. */
async function ready(port: number, since: number): Promise<number> {
  for (;;) {
    const ok = await fetch(`http://127.0.0.1:${port}/api/health`).then(
      (response) => response.ok,
      () => false,
    );
    if (ok) return performance.now() - since;
    await Bun.sleep(5);
  }
}

/** The database every round starts from a copy of: the server makes its tables, then NOTES notes go in directly. */
async function seed(path: string) {
  const server = spawn(["bun", "server.js"], SERVER_CPU, {
    env: { NODE_ENV: "production", PORT: String(PORT), DATABASE_PATH: path },
  });
  await ready(PORT, performance.now());
  server.kill();
  await server.exited;
  const db = new Database(path);
  const insert = db.prepare("INSERT INTO notes (text, createdAt) VALUES (?, ?)");
  const createdAt = new Date().toISOString();
  db.transaction(() => {
    for (let i = 1; i <= NOTES; i++) insert.run(`Note number ${i}, a line of text`, createdAt);
  })();
  db.close();
}

/** Caddy in front of the server, compressing as in production; its state goes in `dir`, not the home directory. */
async function proxy(dir: string) {
  const config = join(dir, "Caddyfile");
  await Bun.write(
    config,
    `{\n\tadmin off\n\tauto_https off\n}\n:${PROXY_PORT} {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:${PORT}\n}\n`,
  );
  const caddy = spawn(["caddy", "run", "--config", config, "--adapter", "caddyfile"], PROXY_CPUS, {
    env: { XDG_DATA_HOME: dir, XDG_CONFIG_HOME: dir },
  });
  await ready(PROXY_PORT, performance.now());
  return caddy;
}

/** One round: a fresh server and database (and Caddy, when proxied), oha on the target, then everything stopped. */
async function round(target: Target, proxied: boolean): Promise<Round> {
  const data = await mkdtemp(join(tmpdir(), "bench-"));
  await copyFile(seeded, join(data, "app.db"));
  const started = performance.now();
  const server = spawn(["bun", "server.js"], SERVER_CPU, {
    env: { NODE_ENV: "production", PORT: String(PORT), RATE_LIMIT: "0", DATABASE_PATH: join(data, "app.db") },
  });
  let caddy: Bun.Subprocess | undefined;
  try {
    const readyMs = await ready(PORT, started);
    if (proxied) caddy = await proxy(data);
    const body = target.body ? ["-m", target.method, "-H", "content-type: application/json", "-d", target.body] : [];
    const load = spawn(
      ["oha", "-z", `${SECONDS}s`, "-c", String(CONNECTIONS), "--no-tui", "--output-format", "json"].concat([
        ...body,
        `http://127.0.0.1:${proxied ? PROXY_PORT : PORT}${target.path}`,
      ]),
      LOAD_CPUS,
      { read: true },
    );
    const report = JSON.parse(await new Response(load.stdout).text());
    const statuses: Record<string, number> = report.statusCodeDistribution;
    const errors = Object.entries(statuses).reduce((sum, [code, n]) => (Number(code) >= 400 ? sum + n : sum), 0);
    return { rps: report.summary.requestsPerSec, p99Ms: report.latencyPercentiles.p99 * 1000, readyMs, errors };
  } finally {
    caddy?.kill();
    await caddy?.exited;
    server.kill();
    await server.exited;
    await rm(data, { recursive: true, force: true });
  }
}

/** The middle value, and the lowest and highest. */
function spread(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)]!, min: sorted[0]!, max: sorted.at(-1)! };
}

/** 268123 → "268k", 7512 → "7.5k". */
function rate(n: number) {
  return n >= 20_000 ? `${Math.round(n / 1000)}k` : `${(n / 1000).toFixed(1)}k`;
}

/** The page's JS file, whose name the build hashes. */
async function bundlePath() {
  const [js] = await Array.fromAsync(new Bun.Glob("chunk-*.js").scan({ cwd: dist }));
  if (!js) throw new Error("No JS bundle in dist/: run `bun run build` first");
  return `/${js}`;
}

if (!Bun.which("oha")) throw new Error("oha isn't installed: see https://github.com/hatoo/oha#installation");
if (!Bun.which("caddy")) throw new Error("caddy isn't installed: see https://caddyserver.com/docs/install");

/** The power profile, where powerprofilesctl reports one: a power-saving one can cut every number by half or more. */
const profile = Bun.which("powerprofilesctl")
  ? Bun.spawnSync(["powerprofilesctl", "get"]).stdout.toString().trim()
  : "";
if (profile && profile !== "performance") {
  console.warn(`The power profile is "${profile}": numbers will be far lower (powerprofilesctl set performance)\n`);
}

const targets: Target[] = [
  { label: "`/` (index.html)", method: "GET", path: "/" },
  { label: "JS bundle", method: "GET", path: await bundlePath() },
  { label: "`/api/hello/{name}`", method: "GET", path: "/api/hello/bench" },
  { label: "`GET /api/notes` (a page of 20)", method: "GET", path: "/api/notes" },
  { label: "`POST /api/notes`", method: "POST", path: "/api/notes", body: '{"text":"A note from the benchmark"}' },
];

/** One cell of the table: the target's rounds, straight or behind Caddy. */
async function cell(target: Target, proxied: boolean): Promise<string> {
  const rounds: Round[] = [];
  for (let i = 0; i < ROUNDS; i++) rounds.push(await round(target, proxied));
  const rps = spread(rounds.map((r) => r.rps));
  const p99 = spread(rounds.map((r) => r.p99Ms));
  const errors = rounds.reduce((sum, r) => sum + r.errors, 0);
  readies.push(...rounds.map((r) => r.readyMs));
  const text = `${rate(rps.median)} req/s [${rate(rps.min)}–${rate(rps.max)}], p99 ${p99.median.toFixed(1)} ms`;
  return errors ? `${text}, ${errors} errors` : text;
}

const seedDir = await mkdtemp(join(tmpdir(), "bench-seed-"));
const seeded = join(seedDir, "app.db");
await seed(seeded);
process.on("exit", () => rmSync(seedDir, { recursive: true, force: true }));

const readies: number[] = [];
console.log("| | Built (`dist/`) | Behind Caddy (`encode zstd gzip`) |\n| --- | --- | --- |");
for (const target of targets) {
  console.log(`| ${target.label} | ${await cell(target, false)} | ${await cell(target, true)} |`);
}

const readyMs = spread(readies);
console.log(
  `\n| Ready to answer | ${Math.round(readyMs.median)} ms [${Math.round(readyMs.min)}–${Math.round(readyMs.max)}] |`,
);
