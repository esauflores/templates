// External
import { MistralAIEmbeddings } from "@langchain/mistralai";

function rec(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function embeddings(apiKey: string): MistralAIEmbeddings {
  return new MistralAIEmbeddings({ apiKey, model: "mistral-embed" });
}

export async function complete(
  apiKey: string,
  messages: ChatMessage[],
  model = "mistral-small-latest",
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  const data = rec(await res.json());
  if (!res.ok) {
    throw new Error(`Mistral chat failed (${res.status})`);
  }
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const content = rec(rec(choices[0]).message).content;
  if (typeof content !== "string" || !content) {
    throw new Error("Mistral chat returned no content");
  }
  return content;
}

export async function ocrPdf(apiKey: string, bytes: Uint8Array, filename: string): Promise<unknown> {
  const form = new FormData();
  form.append("purpose", "ocr");
  form.append("file", new File([Buffer.from(bytes)], filename, { type: "application/pdf" }));

  const up = await fetch("https://api.mistral.ai/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const uploaded = rec(await up.json());
  if (!up.ok || typeof uploaded.id !== "string") {
    throw new Error(`Mistral files: ${String(uploaded.message ?? up.status)}`);
  }

  const ocr = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "file", file_id: uploaded.id },
      include_blocks: true,
      table_format: "html",
    }),
  });
  const data = await ocr.json();
  if (!ocr.ok) {
    throw new Error(`Mistral OCR failed (${ocr.status})`);
  }
  return data;
}
