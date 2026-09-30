# npm-cli-base

Template for an npm-published CLI, extracted from a real shipped one
(`@esauflores/zoom-dl`): TypeScript source, `tsc` build to `dist/`, node shebang,
vitest specs, oxlint + oxfmt. The whole pipeline is verified — check → test → build
→ `node dist/cli.js` runs.

## use it

1. copy this directory; rename `@you/npm-cli-base` and the `bin` name in
   `package.json`, and the name inside `src/helpers/errors.ts` (`die`'s prefix)
2. write your CLI in `src/cli.ts`; pure logic goes in `src/helpers/`, tested
3. `bun install && bun run check && bun run test`
4. `npm login`, then `npm publish --access public --otp=<your 2FA digits>`

## layout

```
package.json         bin → dist/cli.js, files: ["dist"], prepack rebuilds
tsconfig.json        strict, used by check (tsc --noEmit)
tsconfig.build.json  emit config: outDir dist, rewrites .ts import extensions
src/cli.ts           commander entry (node shebang is preserved into dist/)
src/helpers/         pure logic + error plumbing, vitest specs alongside
dist/                build output — what npm ships (gitignored)
```

## notes

- the published binary runs on plain Node.js >= 18 — no bun needed
- `prepack` rebuilds `dist/`, so a tarball can never go stale
- tests are excluded from the build and the tarball
- run `bun run build && node dist/cli.js --help` before publishing to smoke-test
