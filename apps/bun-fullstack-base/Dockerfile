# Two stages: the first installs everything and runs the production build (server/build.ts), the second keeps only
# server/dist, which holds the server, the API and the page already bundled, so it needs no node_modules.
FROM oven/bun:1.4.3-slim AS build

WORKDIR /app

# Dependencies first, so a code change doesn't reinstall them. --omit=peer skips peer dependencies, the big one being
# the npm copy of Bun that bun-plugin-tailwind asks for, which this image already is.
COPY package.json bun.lock bunfig.toml ./
COPY server/package.json server/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile --omit=peer

COPY . .
RUN bun run build

FROM oven/bun:1.4.3-slim

# The built server finds the page's files from its working directory, so it runs from the build's output. Settings
# come from docker run's -e or --env-file, not from a .env in the image.
WORKDIR /app
COPY --from=build /app/server/dist ./

USER bun
EXPOSE 3000
CMD ["bun", "server/src/server.js"]
