import { sendEmail as emailitSend, type SendEmailOptions } from "./emailit";
import { sendEmail as noopSend } from "./noop";

const provider = process.env.EMAIL_PROVIDER ?? "emailit";

export const sendEmail = (() => {
  switch (provider) {
    case "emailit":
      return emailitSend;
    case "noop":
      return noopSend;
    default:
      return emailitSend;
  }
})();
export type { SendEmailOptions };
