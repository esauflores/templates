// External
import { config } from "dotenv";

if (process.env.VITEST) {
  config({ path: ".env.test" });
}

export type Bindings = {
  WEBHOOK_SECRET: string;
};

export const testBindings: Bindings = {
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? "",
};
