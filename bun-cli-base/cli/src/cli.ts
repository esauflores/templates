#!/usr/bin/env bun
// cli-name — one-line description of what it does.
//
// usage: cli-name <name> [count] [-u, --upper]

import { Command } from "commander";

await new Command()
  .name("cli-name")
  .description("One-line description of what this CLI does")
  .argument("<name>", "who to greet")
  .argument("[count]", "how many times")
  .option("-u, --upper", "shout it")
  .addHelpText(
    "after",
    `\nExamples:
  cli-name world            # hello, world
  cli-name world 3 --upper  # HELLO, WORLD ×3
    `,
  )
  .action((name: string, count: string | undefined, opts: { upper?: boolean }) => {
    const n = count == null ? 1 : Number(count);
    if (!Number.isInteger(n) || n < 1) {
      console.error(`cli-name: invalid count: ${count}`);
      process.exit(1);
    }
    const greeting = `hello, ${name}`;
    for (let i = 0; i < n; i++) console.log(opts.upper ? greeting.toUpperCase() : greeting);
  })
  .parseAsync();
