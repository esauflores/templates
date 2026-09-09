// App
import type { Bindings } from "@/env";

import { auth as betterAuth } from "./better-auth";

export const auth = (env: Bindings) => {
  switch (env.AUTH_PROVIDER) {
    case "better-auth":
    default:
      return betterAuth(env);
  }
};
