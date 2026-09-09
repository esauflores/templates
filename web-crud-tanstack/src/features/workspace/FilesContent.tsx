import { ChevronRight, File, FileCode, FileText, Folder, Image, Sheet } from "lucide-react";
import { Fragment, useState } from "react";

import { DataTable } from "#/components/crud/data-table";
import { FormFooter } from "#/components/crud/form-footer";
import { CrudDialog } from "#/components/crud/page";
import { RowActions } from "#/components/crud/row-actions";
import { StatRow } from "#/components/crud/stats";
import { useCrud } from "#/components/crud/use-crud";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { TableCell, TableHead, TableRow } from "#/components/ui/table";
import { FILE_KINDS, FILES, type FileKind, type FileNode } from "#/features/workspace/data/files";
import { daysAgo, fileSize, fmtDate } from "#/lib/format";

const ICON: Record<FileKind, typeof File> = {
  folder: Folder,
  doc: FileText,
  sheet: Sheet,
  image: Image,
  pdf: File,
  code: FileCode,
};

type NewNode = "folder" | FileKind;

export const FilesContent = () => {
  const { items, create, update, remove, removeMany } = useCrud<FileNode>(FILES, "item");
  const [parentId, setParentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FileNode | null>(null);

  const byId = new Map(items.map((n) => [n.id, n]));

  const trail: FileNode[] = [];
  for (
    let cur = parentId ? byId.get(parentId) : undefined;
    cur;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  ) {
    trail.unshift(cur);
  }

  const rows = items
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => (a.kind === "folder" ? 0 : 1) - (b.kind === "folder" ? 0 : 1) || a.name.localeCompare(b.name));

  const collect = (id: string, acc: Set<string>) => {
    acc.add(id);
    for (const n of items) if (n.parentId === id) collect(n.id, acc);
    return acc;
  };

  const onDelete = (node: FileNode) => {
    if (node.kind !== "folder") return remove(node.id, node.name);
    const ids = collect(node.id, new Set<string>());
    removeMany(ids, ids.size === 1 ? `folder “${node.name}”` : `“${node.name}” and ${ids.size - 1} item(s)`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setParentId(null)}
            className={parentId ? "text-muted-foreground hover:text-foreground" : "font-medium"}
          >
            Files
          </button>
          {trail.map((node) => (
            <Fragment key={node.id}>
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setParentId(node.id)}
                className={node.id === parentId ? "font-medium" : "text-muted-foreground hover:text-foreground"}
              >
                {node.name}
              </button>
            </Fragment>
          ))}
        </nav>

        <CrudDialog
          title="New item"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New</Button>}
        >
          <NodeForm
            submitLabel="Create"
            onSubmit={({ name, kind }) => {
              create(
                {
                  parentId,
                  name,
                  kind,
                  size: kind === "folder" ? 0 : 1024 + Math.floor(Math.random() * 400_000),
                  updatedAt: daysAgo(0),
                },
                name,
              );
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Files", value: items.filter((n) => n.kind !== "folder").length },
          { label: "Folders", value: items.filter((n) => n.kind === "folder").length },
          { label: "Total size", value: fileSize(items.reduce((s, n) => s + n.size, 0)) },
          { label: "In this folder", value: rows.length },
        ]}
      />

      <DataTable
        rows={rows}
        empty="This folder is empty."
        head={
          <>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        }
        render={(node) => {
          const Icon = ICON[node.kind];
          return (
            <TableRow key={node.id}>
              <TableCell>
                {node.kind === "folder" ? (
                  <button
                    type="button"
                    onClick={() => setParentId(node.id)}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {node.name}
                  </button>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {node.name}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">{node.kind}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {node.kind === "folder" ? "—" : fileSize(node.size)}
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(node.updatedAt)}</TableCell>
              <TableCell>
                <RowActions deleteLabel={node.name} onEdit={() => setEditing(node)} onDelete={() => onDelete(node)} />
              </TableCell>
            </TableRow>
          );
        }}
      />

      <CrudDialog title="Rename" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <NodeForm
            initial={editing}
            submitLabel="Save"
            onSubmit={({ name }) => {
              update(editing.id, { name }, name);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const NodeForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: FileNode;
  submitLabel: string;
  onSubmit: (draft: { name: string; kind: NewNode }) => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<NewNode>(initial?.kind ?? "folder");
  const renaming = initial !== undefined;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit({ name: name.trim(), kind });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="node-name">Name</Label>
        <Input id="node-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {!renaming && (
        <div className="grid gap-1.5">
          <Label htmlFor="node-kind">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as NewNode)}>
            <SelectTrigger id="node-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="folder">Folder</SelectItem>
              {FILE_KINDS.map((k) => (
                <SelectItem key={k} value={k} className="capitalize">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <FormFooter submitLabel={submitLabel} disabled={!name.trim()} />
    </form>
  );
};
