# bench

Benchmarks, run locally (they aren't in the Docker image): the built server under HTTP load, and the API's code in
the process. Results go in [`server/README.md`](../server/README.md#benchmark).

`bun run bench`, from the repo root, builds and runs both:

| File           | What it measures                                                                |
| -------------- | ------------------------------------------------------------------------------- |
| `http.ts`      | the built server (`server/dist/`), each route loaded with oha: the table's rows |
| `api.bench.ts` | the API's routes and queries in the process, with Vitest's `bench` (tinybench)  |

## HTTP (`http.ts`)

Each route gets 3 rounds of 5 s at 100 connections, each round on a fresh server and a fresh database of 50 notes,
without the rate limit (`RATE_LIMIT=0`, as all the load comes from one client). It prints the median and the range
of requests a second, and the p99.

- Needs oha (`cargo install oha`, or see its [installation](https://github.com/hatoo/oha#installation)).
- On Linux, the server is pinned to core 1 and oha to cores 2, 3, 6 and 7 with `taskset` (`SERVER_CPU`, `LOAD_CPUS`
  in `http.ts`): the numbers are one core's. Keep the server and oha on different physical cores
  (`/sys/devices/system/cpu/cpu*/topology/core_id`).
- Plugged in, on a performance power profile (`powerprofilesctl set performance`), and with little else running: a
  power-saving profile halves every number.

## In the process (`api.bench.ts`)

Calls the API through `createApp().request(…)`, and the notes queries directly, on an in-memory database: no server,
no network, the request log muted. The numbers only compare the lines of one run with each other (a prepared query
against the same query built each time, one route against another): with no network they're far higher than over
HTTP, and Vitest runs the source, not the built bundle.

To compare two versions of something, add a test with `bench.compare(bench("a", …), bench("b", …))`.
