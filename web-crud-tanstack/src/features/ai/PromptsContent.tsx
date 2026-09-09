import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { StatRow } from "#/components/analytics/stats";
import { bulkRemove, type Column, DataGrid } from "#/components/crud/data-grid";
import { EmptyState } from "#/components/crud/empty-state";
import { Field, SelectField } from "#/components/crud/field";
import { FormFooter } from "#/components/crud/form-footer";
import { CrudDialog } from "#/components/crud/page";
import { RowActions } from "#/components/crud/row-actions";
import { useCrud } from "#/components/crud/use-crud";
import { useZodForm } from "#/components/crud/use-zod-form";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { PROMPT_CATEGORIES, PROMPTS, type Prompt } from "#/features/ai/data/prompts";
import { fillTemplate, promptVars } from "#/features/ai/lib/prompt";
import { crudPersist } from "#/lib/api";
import { daysAgo, fmtDate } from "#/lib/format";

const persist = crudPersist<Prompt>("ai/prompts");

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80, "Keep it under 80 characters"),
  body: z.string().trim().min(1, "Body is required"),
  category: z.enum(PROMPT_CATEGORIES),
  tags: z.string().trim().default(""),
});
type Draft = z.infer<typeof schema>;
const submit = (d: Draft): Omit<Prompt, "id"> => ({ ...d, updatedAt: daysAgo(0) });

export const PromptsContent = () => {
  const navigate = useNavigate();
  const { items, create, update, remove, removeMany } = useCrud<Prompt>(PROMPTS, "prompt", { persist });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [using, setUsing] = useState<Prompt | null>(null);

  const runInChat = useCallback((seed: string) => navigate({ to: "/assistant", search: { seed } }), [navigate]);
  const usePrompt = useCallback(
    (prompt: Prompt) => {
      if (promptVars(prompt.body).length === 0) runInChat(prompt.body);
      else setUsing(prompt);
    },
    [runInChat],
  );

  const columns = useMemo<Column<Prompt>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.tags || "—"}</span>,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="xs" variant="ghost" onClick={() => usePrompt(row.original)}>
              Use
            </Button>
            <RowActions
              deleteLabel={row.original.title}
              onEdit={() => setEditing(row.original)}
              onDuplicate={() =>
                create(
                  { ...submit(row.original), title: `${row.original.title} (copy)` },
                  `${row.original.title} (copy)`,
                )
              }
              onDelete={() => remove(row.original.id, row.original.title)}
            />
          </div>
        ),
      },
    ],
    [create, remove, usePrompt],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CrudDialog
          title="New prompt"
          open={createOpen}
          onOpenChange={setCreateOpen}
          trigger={<Button size="sm">New prompt</Button>}
        >
          <PromptForm
            submitLabel="Create"
            onSubmit={(d) => {
              create(submit(d), d.title);
              setCreateOpen(false);
            }}
          />
        </CrudDialog>
      </div>

      <StatRow
        items={[
          { label: "Prompts", value: items.length },
          ...PROMPT_CATEGORIES.slice(0, 3).map((c) => ({
            label: c,
            value: items.filter((p) => p.category === c).length,
          })),
        ]}
      />

      <DataGrid
        data={items}
        columns={columns}
        searchPlaceholder="Filter prompts…"
        storageKey="ai-prompts"
        exportName="prompts"
        facets={["category"]}
        bulkActions={bulkRemove(removeMany, "prompt")}
        empty={
          <EmptyState
            message="No prompts yet."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New prompt
              </Button>
            }
          />
        }
      />

      <CrudDialog title="Edit prompt" open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <PromptForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => {
              update(editing.id, submit(d), d.title);
              setEditing(null);
            }}
          />
        )}
      </CrudDialog>

      <CrudDialog title="Fill in the prompt" open={using !== null} onOpenChange={(open) => !open && setUsing(null)}>
        {using && (
          <FillForm
            prompt={using}
            onSubmit={(values) => {
              runInChat(fillTemplate(using.body, values));
              setUsing(null);
            }}
          />
        )}
      </CrudDialog>
    </div>
  );
};

const PromptForm = ({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Prompt;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, {
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    category: initial?.category ?? "Other",
    tags: initial?.tags ?? "",
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Title" htmlFor="prompt-title" error={errors.title?.message}>
        <Input id="prompt-title" autoFocus {...register("title")} />
      </Field>
      <Field label="Body" htmlFor="prompt-body" error={errors.body?.message}>
        <Textarea id="prompt-body" rows={6} placeholder="Use {{variables}} for fill-ins…" {...register("body")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          control={control}
          name="category"
          id="prompt-category"
          label="Category"
          options={PROMPT_CATEGORIES}
          error={errors.category?.message}
        />
        <Field label="Tags" htmlFor="prompt-tags" error={errors.tags?.message}>
          <Input id="prompt-tags" placeholder="comma, separated" {...register("tags")} />
        </Field>
      </div>
      <FormFooter submitLabel={submitLabel} />
    </form>
  );
};

const FillForm = ({ prompt, onSubmit }: { prompt: Prompt; onSubmit: (values: Record<string, string>) => void }) => {
  const vars = promptVars(prompt.body);
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      {vars.map((v) => (
        <div key={v} className="grid gap-1.5">
          <Label htmlFor={`var-${v}`}>{v}</Label>
          <Textarea
            id={`var-${v}`}
            rows={2}
            value={values[v] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
          />
        </div>
      ))}
      <FormFooter submitLabel="Open in chat" />
    </form>
  );
};
