import { auth as betterAuth } from "./better-auth";

const provider = process.env.AUTH_PROVIDER ?? "better-auth";

export const auth = (() => {
  switch (provider) {
    case "better-auth":
      return betterAuth;
    // case "clerk": return clerk;
    // case "noop": return noop;
    default:
      return betterAuth;
  }
})();
