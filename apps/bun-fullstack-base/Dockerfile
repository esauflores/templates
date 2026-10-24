# Two stages: Debian builds dist/, then Alpine runs it. dist/ is plain JavaScript with no node_modules (SQLite is
# Bun's own), so the small Alpine image works.
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

# Marks the container unhealthy when /api/health stops answering, so Compose or Swarm can restart it.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["bun", "server.js"]
