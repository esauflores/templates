#!/usr/bin/env node
// cli-name — one-line description of what it does.
//
// usage: cli-name <name> [count] [-u, --upper]

import { Command } from "commander";

import { die } from "./helpers/errors.ts";
import { greet } from "./helpers/text.ts";

await new Command()
  .name("cli-name")
  .description("One-line description of what this CLI does")
  .argument("<name>", "who to greet")
  .argument("[count]", "how many times")
  .option("-u, --upper", "shout it")
  .addHelpText(
    "after",
    `
examples:
  cli-name world            # hello, world
  cli-name world 3 --upper  # HELLO, WORLD ×3`,
  )
  .action((name: string, count: string | undefined, opts: { upper?: boolean }) => {
    const n = count == null ? 1 : Number(count);
    if (!Number.isInteger(n) || n < 1) die(`invalid count: ${count}`);
    for (let i = 0; i < n; i++) console.log(greet(name, opts.upper));
  })
  .parseAsync();
