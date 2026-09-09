// External
import { describe, expect, it } from "vitest";

// Feature
import { boxesToDocuments } from "./chunk";

const page = (blocks: unknown[], index = 0) => ({
  index,
  dimensions: { width: 1000, height: 1000 },
  blocks,
});

const box = (type: string, content: string, y0: number, y1: number) => ({
  type,
  content,
  top_left_x: 100,
  top_left_y: y0,
  bottom_right_x: 900,
  bottom_right_y: y1,
});

describe("boxesToDocuments", () => {
  it("merges a short title into the following paragraph and unions the box", () => {
    const docs = boxesToDocuments({
      pages: [
        page([
          box("title", "Arrays", 80, 120),
          box(
            "text",
            "An array is a contiguous sequence of elements indexed from zero with constant-time random access.",
            140,
            220,
          ),
          box("header", "Chapter 1", 10, 40),
        ]),
      ],
    });

    expect(docs).toHaveLength(1);
    expect(docs[0].pageContent.startsWith("Arrays\n")).toBe(true);
    expect(docs[0].metadata.positions).toEqual([[1, 10, 90, 8, 22]]);
  });

  it("skips header/footer/image and junk tokens", () => {
    const docs = boxesToDocuments({
      pages: [
        page([
          box("footer", "12", 960, 990),
          box("text", "{", 100, 120),
          box(
            "text",
            "Use two pointers on a sorted array to find a pair that sums to the target in linear time.",
            200,
            300,
          ),
        ]),
      ],
    });

    expect(docs).toHaveLength(1);
    expect(docs[0].pageContent).toContain("two pointers");
  });

  it("starts a new chunk when the page changes", () => {
    const docs = boxesToDocuments({
      pages: [
        page(
          [
            box(
              "text",
              "First page paragraph that is long enough to stand as its own retrieval unit after merge.",
              100,
              200,
            ),
          ],
          0,
        ),
        page(
          [
            box(
              "text",
              "Second page paragraph that is also long enough to flush as a separate chunk on its own.",
              100,
              200,
            ),
          ],
          1,
        ),
      ],
    });

    expect(docs).toHaveLength(2);
    expect(docs[0].metadata.positions[0][0]).toBe(1);
    expect(docs[1].metadata.positions[0][0]).toBe(2);
  });

  it("returns empty when OCR has no blocks", () => {
    expect(boxesToDocuments({ pages: [{ index: 0, blocks: [] }] })).toEqual([]);
    expect(boxesToDocuments({})).toEqual([]);
  });
});
