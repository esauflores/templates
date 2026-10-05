# bun-cli-base

Minimal template for a Bun CLI published to npm: TypeScript runs directly on Bun — no build step.

## use it

1. copy this directory; rename `@you/bun-cli-base` and the `bin` name in `cli/package.json`
2. write your CLI in `cli/src/cli.ts`
3. `cd cli && bun install && bun run check`
4. from `cli/`, run `npm login` and `npm publish --access public --otp=<your 2FA digits>`

## layout

```
cli/package.json   npm package metadata and scripts
cli/bun.lock       Bun dependency lockfile
cli/tsconfig.json  strict, used by check (tsc --noEmit)
cli/src/cli.ts     self-contained Commander entry (Bun runs .ts directly)
```

## checks

From `cli/`, `bun run check` runs `tsc --noEmit` for type checking.

## notes

- the published binary needs bun on PATH (`#!/usr/bin/env bun`)
- there is no build step: what you write is what npm ships
- smoke-test before publishing: `bun run cli -- --help`
