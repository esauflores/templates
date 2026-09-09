import { daysAgo } from "#/lib/format";

export type FileKind = "folder" | "doc" | "sheet" | "image" | "pdf" | "code";
export type FileNode = {
  id: string;
  parentId: string | null;
  name: string;
  kind: FileKind;
  /** Bytes. 0 for folders. */
  size: number;
  updatedAt: string;
};

/** File kinds selectable in the "New" dialog (folder is offered alongside). */
export const FILE_KINDS: Exclude<FileKind, "folder">[] = ["doc", "sheet", "image", "pdf", "code"];

const KB = 1024;
const f = (id: string, parentId: string | null, name: string, kind: FileKind, size: number, age: number): FileNode => ({
  id,
  parentId,
  name,
  kind,
  size,
  updatedAt: daysAgo(age),
});

export const FILES: FileNode[] = [
  // root
  f("d-docs", null, "Documents", "folder", 0, 1),
  f("d-design", null, "Design", "folder", 0, 3),
  f("d-src", null, "src", "folder", 0, 0),
  f("n-readme", null, "README.md", "doc", 4 * KB, 2),
  f("n-budget", null, "budget-2026.sheet", "sheet", 82 * KB, 6),
  // Documents/
  f("d-contracts", "d-docs", "Contracts", "folder", 0, 12),
  f("n-onboard", "d-docs", "Onboarding.pdf", "pdf", 1.2 * KB * KB, 4),
  f("n-notes", "d-docs", "Meeting notes.doc", "doc", 18 * KB, 1),
  // Documents/Contracts/
  f("n-msa", "d-contracts", "MSA-acme.pdf", "pdf", 320 * KB, 40),
  f("n-nda", "d-contracts", "NDA-globex.pdf", "pdf", 210 * KB, 55),
  // Design/
  f("n-logo", "d-design", "logo.image", "image", 96 * KB, 3),
  f("n-hero", "d-design", "hero-shot.image", "image", 3.4 * KB * KB, 8),
  f("d-exports", "d-design", "Exports", "folder", 0, 3),
  // Design/Exports/
  f("n-og", "d-exports", "og-card.image", "image", 140 * KB, 3),
  // src/
  f("n-index", "d-src", "index.code", "code", 2 * KB, 0),
  f("n-app", "d-src", "App.code", "code", 6 * KB, 0),
  f("d-lib", "d-src", "lib", "folder", 0, 0),
  // src/lib/
  f("n-utils", "d-lib", "utils.code", "code", 900, 0),
  f("n-format", "d-lib", "format.code", "code", 1.5 * KB, 0),
];
