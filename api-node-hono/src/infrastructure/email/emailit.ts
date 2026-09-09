// App
import type { Bindings } from "@/env";

const EMAILIT_URL = "https://api.emailit.com/v2/emails";
const FETCH_TIMEOUT_MS = 8_000;

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey?: string;
};

type EmailitResponse = {
  id: string;
};

export const sendEmail = async (env: Bindings, opts: SendEmailOptions): Promise<EmailitResponse> => {
  const { idempotencyKey, ...body } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(EMAILIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAILIT_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey && {
          "Idempotency-Key": idempotencyKey,
        }),
      },
      body: JSON.stringify({
        from: env.EMAILIT_FROM,
        ...body,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();

      console.error("Emailit request failed", {
        status: response.status,
        error,
      });

      throw new Error("Failed to send email");
    }

    return (await response.json()) as EmailitResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Emailit timeout after ${FETCH_TIMEOUT_MS}ms`);
    }

    throw err;
  } finally {
    clearTimeout(timer);
  }
};
