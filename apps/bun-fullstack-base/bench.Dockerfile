# syntax=docker/dockerfile:1
# The benchmark from inside a cloud project: a second service, next to the app's, that loads it over the private
# network, so no request leaves the provider's network (no egress to pay for, no internet latency). Built from this
# folder with this file (Railway: root directory apps/bun-fullstack-base, Dockerfile path bench.Dockerfile). It
# prints its results to the logs, one `BENCH` line per round, then sleeps.
# - APP_URL is the app's private address, http://app.railway.internal:3000 by default (the app's private name "app").
# - The app should run with RATE_LIMIT=0, as all the load comes from here.
# - First, the app's database is filled to a million notes through the API, as `bun run bench` does locally; a
#   database that has them already is left as is. Then the same routes as bench.ts, 3 rounds of 5 s each, but all on
#   the one running server and database, as a cloud service can't be restarted per round.
FROM alpine:3.22

RUN apk add --no-cache jq
ADD --chmod=755 https://github.com/hatoo/oha/releases/download/v1.16.0/oha-linux-amd64 /usr/local/bin/oha

ENV APP_URL=http://app.railway.internal:3000

COPY <<'EOF' /bench.sh
set -eu
until wget -qO /dev/null "$APP_URL/api/health"; do sleep 1; done
echo "BENCH ready, $(nproc) CPUs"

latest=$(wget -qO- "$APP_URL/api/notes?limit=1" | jq -r '.notes[0].id // 0')
if [ "$latest" -lt 1000000 ]; then
  oha -n $((1000000 - latest)) -c 100 --no-tui --output-format json -m POST -H "content-type: application/json" \
    -d '{"text":"Note number, a line of text"}' "$APP_URL/api/notes" |
    jq -c '{seeded: .summary.total, rps: .summary.requestsPerSec, status: .statusCodeDistribution}' | sed 's/^/BENCH /'
fi

# Three rounds of one route: the label, then oha's own arguments.
rounds() {
  label=$1
  shift
  for _ in 1 2 3; do
    oha -z 5s -c 100 --no-tui --output-format json "$@" |
      jq -c --arg t "$label" '{t: $t, rps: .summary.requestsPerSec, p99ms: (.latencyPercentiles.p99 * 1000), status: .statusCodeDistribution}' |
      sed 's/^/BENCH /'
  done
}

js=$(wget -qO- "$APP_URL/" | grep -oE 'chunk-[a-z0-9]+\.js' | head -1)
rounds index "$APP_URL/"
rounds js "$APP_URL/$js"
rounds hello "$APP_URL/api/hello/bench"
rounds notes "$APP_URL/api/notes"
rounds post -m POST -H "content-type: application/json" -d '{"text":"A note from the benchmark"}' "$APP_URL/api/notes"
echo "BENCH done"
sleep infinity
EOF

CMD ["sh", "/bench.sh"]
