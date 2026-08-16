// App
import type { Bindings } from "@/env";

import { sendEmail as emailitSend, type SendEmailOptions } from "./emailit";
import { sendEmail as noopSend } from "./noop";

export const sendEmail = (env: Bindings, opts: SendEmailOptions) => {
  switch (env.EMAIL_PROVIDER) {
    case "noop":
      return noopSend(env, opts);
    case "emailit":
    default:
      return emailitSend(env, opts);
  }
};
export type { SendEmailOptions };
