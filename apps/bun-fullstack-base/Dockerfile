# Two stages: the first installs everything and runs the production build (scripts/build.ts), the second keeps only
# dist/, which holds the server, the API and the page already bundled and the migrations, so it needs no
# node_modules: the database is SQLite from Bun itself, with no addon to build for a platform. That's why the second
# stage can be Alpine (musl), about 110 MB smaller than the Debian slim one; the build stage stays on Debian, where the
# dependencies are installed for, and its dist is plain JavaScript.
FROM oven/bun:1.4.3-slim AS build

WORKDIR /app

# Dependencies first, so a code change doesn't reinstall them.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.4.3-alpine

# The build's output only. Settings come from docker run's -e or --env-file, not from a .env in the image.
WORKDIR /app
COPY --from=build /app/dist ./

# The database lives in /data: mount a volume there (-v app-data:/data) so it outlives the container. No VOLUME line,
# which some hosts (Railway) refuse, as they mount their own.
RUN mkdir /data && chown bun:bun /data
ENV DATABASE_PATH=/data/app.db

# Hono's logger colors the status codes unless NO_COLOR is set; container logs aren't a terminal, so plain text.
ENV NO_COLOR=1

USER bun
EXPOSE 3000

# Docker marks the container unhealthy when /api/health stops answering (Compose and Swarm can then restart it), on
# the port the server listens on, with Alpine's own (busybox) wget, not a whole Bun process per check. The health check
# isn't rate-limited.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["bun", "server.js"]
