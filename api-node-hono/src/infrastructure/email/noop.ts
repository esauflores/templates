// App
import type { Bindings } from "@/env";

import type { SendEmailOptions } from "./emailit";

export const sendEmail = async (_env: Bindings, _opts: SendEmailOptions) => {
  // ponytail: no-op for tests; production uses emailit
};
