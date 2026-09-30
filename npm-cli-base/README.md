# npm-cli-base

Template for a bun CLI published to npm, extracted from a real shipped one
(`@esauflores/zoom-dl`): TypeScript runs directly on bun — no build step — with
oxlint + oxfmt + tsc checks and vitest specs.

## use it

1. copy this directory; rename `@you/npm-cli-base` and the `bin` name in
   `package.json`, and the name inside `src/helpers/errors.ts` (`die`'s prefix)
2. write your CLI in `src/cli.ts`; pure logic goes in `src/helpers/`, tested
3. `bun install && bun run check && bun run test`
4. `npm login`, then `npm publish --access public --otp=<your 2FA digits>`

## layout

```
package.json      bin → src/cli.ts, files: ["src"] (tests excluded), bun engines
tsconfig.json     strict, used by check (tsc --noEmit)
src/cli.ts        commander entry (bun shebang — bun runs .ts directly)
src/helpers/      pure logic + error plumbing, vitest specs alongside
```

## checks

`bun run check` = `oxlint && oxfmt --check && tsc --noEmit` — lint, format,
types. `bun run check:fix` auto-fixes lint and format.

## notes

- the published binary needs bun on PATH (`#!/usr/bin/env bun`)
- there is no build step: what you write is what npm ships
- tests are excluded from the tarball via `files`
- smoke-test before publishing: `bun run cli -- --help`
