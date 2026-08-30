// External
import { config } from "dotenv";

if (process.env.VITEST) {
  config({ path: ".env.test" });
}

export type Bindings = {
  MISTRAL_API_KEY: string;
  API_KEY: string;
  INDEX_PATH: string;
  PORT: string;
};

export function bindings(): Bindings {
  return {
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "",
    API_KEY: process.env.API_KEY ?? "",
    INDEX_PATH: process.env.INDEX_PATH ?? "./data/index.json",
    PORT: process.env.PORT ?? "8787",
  };
}

export const testBindings: Bindings = {
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "test",
  API_KEY: process.env.API_KEY ?? "",
  INDEX_PATH: process.env.INDEX_PATH ?? "./data/test-index.json",
  PORT: process.env.PORT ?? "8787",
};
