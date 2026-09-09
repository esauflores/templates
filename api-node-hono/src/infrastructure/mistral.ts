// Mistral over plain `fetch` — no SDK. Embeddings, chat completion, and PDF OCR.

const API = "https://api.mistral.ai/v1";

function rec(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Embed one or more texts. Returns a vector per input, order preserved. */
export async function embed(apiKey: string, texts: string[], model = "mistral-embed"): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${API}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
  });
  const data = rec(await res.json());
  if (!res.ok) throw new Error(`Mistral embeddings failed (${res.status})`);

  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.map((row) => {
    const vec = rec(row).embedding;
    if (!Array.isArray(vec)) throw new Error("Mistral embeddings returned no vector");
    return vec as number[];
  });
}

export async function complete(
  apiKey: string,
  messages: ChatMessage[],
  model = "mistral-small-latest",
): Promise<string> {
  const res = await fetch(`${API}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  const data = rec(await res.json());
  if (!res.ok) throw new Error(`Mistral chat failed (${res.status})`);

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const content = rec(rec(choices[0]).message).content;
  if (typeof content !== "string" || !content) throw new Error("Mistral chat returned no content");
  return content;
}

export async function ocrPdf(apiKey: string, bytes: Uint8Array, filename: string): Promise<unknown> {
  const form = new FormData();
  form.append("purpose", "ocr");
  form.append("file", new File([Buffer.from(bytes)], filename, { type: "application/pdf" }));

  const up = await fetch(`${API}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const uploaded = rec(await up.json());
  if (!up.ok || typeof uploaded.id !== "string") {
    throw new Error(`Mistral files: ${String(uploaded.message ?? up.status)}`);
  }

  const ocr = await fetch(`${API}/ocr`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "file", file_id: uploaded.id },
      include_blocks: true,
      table_format: "html",
    }),
  });
  const data = await ocr.json();
  if (!ocr.ok) throw new Error(`Mistral OCR failed (${ocr.status})`);
  return data;
}
