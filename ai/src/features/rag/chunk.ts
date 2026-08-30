// External
import { Document } from "@langchain/core/documents";

/** Overlay contract: [page, left, right, top, bottom] as % of the page. */
export type ChunkPosition = [number, number, number, number, number];

const MIN_MERGE_TOKENS = 32;
const SKIP_TYPES = new Set(["header", "footer", "image", "signature"]);

function tokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length));
}

function isJunk(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return true;
  return /^[\d{}()[\].,;:_/=+\-–—]+$/.test(t);
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function rec(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function boxPct(
  left: number,
  right: number,
  top: number,
  bottom: number,
  width?: number,
  height?: number,
): [number, number, number, number] {
  const max = Math.max(left, right, top, bottom);
  if (max <= 1) return [left * 100, right * 100, top * 100, bottom * 100];
  if (width && height && max > 100) {
    return [(left / width) * 100, (right / width) * 100, (top / height) * 100, (bottom / height) * 100];
  }
  return [left, right, top, bottom];
}

function blockBox(
  block: Record<string, unknown>,
  page: number,
  width?: number,
  height?: number,
): ChunkPosition | undefined {
  const bbox = rec(block.bbox);
  const left = num(block.top_left_x) ?? num(bbox.top_left_x) ?? num(bbox.x0);
  const top = num(block.top_left_y) ?? num(bbox.top_left_y) ?? num(bbox.y0);
  const right = num(block.bottom_right_x) ?? num(bbox.bottom_right_x) ?? num(bbox.x1);
  const bottom = num(block.bottom_right_y) ?? num(bbox.bottom_right_y) ?? num(bbox.y1);
  if (left === undefined || right === undefined || top === undefined || bottom === undefined) {
    return undefined;
  }
  const [l, r, t, b] = boxPct(left, right, top, bottom, width, height);
  return [page, l, r, t, b];
}

function blockText(block: Record<string, unknown>): string {
  for (const key of ["content", "text", "markdown"]) {
    const v = block[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function unionPos(a: ChunkPosition[], extra: ChunkPosition): ChunkPosition[] {
  const same = a.find((p) => p[0] === extra[0]);
  if (!same) return [...a, extra];
  same[1] = Math.min(same[1], extra[1]);
  same[2] = Math.max(same[2], extra[2]);
  same[3] = Math.min(same[3], extra[3]);
  same[4] = Math.max(same[4], extra[4]);
  return a;
}

/** One OCR box = one LangChain Document. Short boxes merge (~32 tokens). */
export function boxesToDocuments(ocr: unknown): Document[] {
  const pages = rec(ocr).pages;
  if (!Array.isArray(pages)) return [];
  const docs: Document[] = [];
  let pending: { text: string; positions: ChunkPosition[] } | undefined;

  const flush = () => {
    if (!pending || isJunk(pending.text)) {
      pending = undefined;
      return;
    }
    docs.push(
      new Document({
        pageContent: pending.text,
        metadata: {
          id: `c${docs.length}`,
          positions: pending.positions,
        },
      }),
    );
    pending = undefined;
  };

  for (const rawPage of pages) {
    const page = rec(rawPage);
    const dims = rec(page.dimensions);
    const width = num(dims.width);
    const height = num(dims.height);
    const index = num(page.index) ?? 0;
    const pageNo = index + 1;
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];

    for (const rawBlock of blocks) {
      const block = rec(rawBlock);
      const type = typeof block.type === "string" ? block.type : "text";
      if (SKIP_TYPES.has(type)) continue;
      const text = blockText(block);
      if (!text || isJunk(text)) continue;
      const pos = blockBox(block, pageNo, width, height);
      if (!pos) continue;

      if (!pending) {
        pending = { text, positions: [pos] };
      } else if (pending.positions[0]?.[0] === pos[0]) {
        pending.text += `\n${text}`;
        pending.positions = unionPos(pending.positions, pos);
      } else {
        flush();
        pending = { text, positions: [pos] };
      }
      if (pending && tokens(pending.text) >= MIN_MERGE_TOKENS) flush();
    }
  }
  flush();
  return docs;
}
