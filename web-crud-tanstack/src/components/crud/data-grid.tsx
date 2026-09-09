"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrHas,
  filterFn_includesString,
  flexRender,
  globalFilteringFeature,
  type RowData,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

/** TanStack Table v9 registers features + row models explicitly; do it once, outside the component. */
const GRID_FEATURES = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature, // globalFilteringFeature / filteredRowModel depend on this
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
});

/** Column definition bound to the grid's feature set — use this in resource pages. */
export type Column<T extends RowData> = ColumnDef<typeof GRID_FEATURES, T>;

const SELECT_COL_ID = "select";
const selectCol = <T extends RowData>(): Column<T> => ({
  id: SELECT_COL_ID,
  enableSorting: false,
  enableHiding: false,
  header: "",
});

// ── localStorage persistence for sort / search / visible columns / facets ───
type Persisted = {
  sorting: SortingState;
  globalFilter: string;
  columnVisibility: Record<string, boolean>;
  columnFilters: ColumnFiltersState;
};
const load = <K extends keyof Persisted>(key: string | undefined, sub: K, fallback: Persisted[K]): Persisted[K] => {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`datagrid:${key}`);
    return raw ? ((JSON.parse(raw) as Partial<Persisted>)[sub] ?? fallback) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string | undefined, value: Persisted) => {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(`datagrid:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

// ── CSV ────────────────────────────────────────────────────────────────────
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export interface DataGridProps<T extends RowData> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  /** Rows per page. `0` shows everything (no pager). Default: 10. */
  pageSize?: number;
  /** Persist sort / search / column visibility to `localStorage` under this key. */
  storageKey?: string;
  /** Base filename for the CSV export (no extension). Omit to hide the Export button. */
  exportName?: string;
  /** Column ids (accessor keys) to expose as multi-select "facet" dropdowns, e.g. `["status"]`. */
  facets?: string[];
  /** When set, adds a checkbox column and a bulk-action bar rendered from the selected rows. */
  bulkActions?: (rows: T[], clear: () => void) => ReactNode;
  empty?: ReactNode;
}

/**
 * Sortable / filterable / paginated table on `@tanstack/react-table` v9. Pass
 * `Column`s; the rest (search box, column show/hide, CSV export, pager, optional
 * selection + bulk bar) is handled here. For a plain read-only table use `DataTable`.
 */
export function DataGrid<T extends RowData>({
  data,
  columns,
  searchPlaceholder = "Filter…",
  pageSize = 10,
  storageKey,
  exportName,
  facets = [],
  bulkActions,
  empty = "No results.",
}: DataGridProps<T>) {
  // Facet columns filter with `arrHas` (row value ∈ selected values); inject it so pages don't have to.
  const facetSet = new Set(facets);
  const baseColumns = bulkActions ? [selectCol<T>(), ...columns] : columns;
  const allColumns = baseColumns.map((c) => {
    const id = c.id ?? (c as { accessorKey?: string }).accessorKey;
    return id && facetSet.has(id) ? { ...c, filterFn: filterFn_arrHas } : c;
  });

  const [sorting, setSorting] = useState<SortingState>(() => load(storageKey, "sorting", []));
  const [globalFilter, setGlobalFilter] = useState(() => load(storageKey, "globalFilter", ""));
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    load(storageKey, "columnVisibility", {}),
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => load(storageKey, "columnFilters", []));
  useEffect(
    () => save(storageKey, { sorting, globalFilter, columnVisibility, columnFilters }),
    [storageKey, sorting, globalFilter, columnVisibility, columnFilters],
  );

  const table = useTable({
    features: GRID_FEATURES,
    data,
    columns: allColumns,
    state: { sorting, globalFilter, columnVisibility, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: "includesString",
    getRowId: (row, index) => (row as { id?: string }).id ?? String(index),
    initialState: pageSize > 0 ? { pagination: { pageIndex: 0, pageSize } } : undefined,
  });

  const facetOptions = (id: string) =>
    [...new Set(data.map((r) => String((r as Record<string, unknown>)[id] ?? "")).filter(Boolean))].sort();

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const hideable = table.getAllColumns().filter((c) => c.getCanHide());
  const rows = table.getRowModel().rows;

  const exportCsv = () => {
    const cols = table.getVisibleFlatColumns().filter((c) => c.id !== SELECT_COL_ID && c.id !== "actions");
    const src = selected.length ? table.getSelectedRowModel().rows : table.getFilteredRowModel().rows;
    const csv = [
      cols.map((c) => csvCell(c.id)).join(","),
      ...src.map((row) => cols.map((c) => csvCell(row.getValue(c.id))).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${exportName}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={String(globalFilter ?? "")}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 max-w-56"
        />
        {facets.map((id) => {
          const active = (table.getColumn(id)?.getFilterValue() as string[] | undefined) ?? [];
          const toggle = (value: string) => {
            const next = active.includes(value) ? active.filter((v) => v !== value) : [...active, value];
            table.getColumn(id)?.setFilterValue(next.length ? next : undefined);
          };
          return (
            <DropdownMenu key={id}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter />
                  <span className="capitalize">{id}</span>
                  {active.length > 0 ? (
                    <span className="rounded bg-secondary px-1 text-xs tabular-nums">{active.length}</span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="capitalize">{id}</DropdownMenuLabel>
                {facetOptions(id).map((value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    className="capitalize"
                    checked={active.includes(value)}
                    onCheckedChange={() => toggle(value)}
                  >
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        {selected.length > 0 && bulkActions ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selected.length} selected</span>
            {bulkActions(selected, () => table.resetRowSelection())}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {exportName ? (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download />
              Export
            </Button>
          ) : null}
          {hideable.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {hideable.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className={header.column.id === SELECT_COL_ID ? "w-8" : undefined}>
                      {header.column.id === SELECT_COL_ID ? (
                        <Checkbox
                          aria-label="Select all"
                          checked={
                            table.getIsAllPageRowsSelected()
                              ? true
                              : table.getIsSomePageRowsSelected()
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                        />
                      ) : header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-ml-1 flex items-center gap-1 rounded px-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.id === SELECT_COL_ID ? (
                        <Checkbox
                          aria-label="Select row"
                          checked={row.getIsSelected()}
                          onCheckedChange={(v) => row.toggleSelected(!!v)}
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageSize > 0 && table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{table.getFilteredRowModel().rows.length} rows</span>
          <div className="flex items-center gap-2">
            <span>
              Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One-liner wiring a `DataGrid` `bulkActions` to `useCrud.removeMany`. */
export const bulkRemove =
  <T extends { id: string }>(removeMany: (ids: Set<string>, label: string) => void, noun: string) =>
  (rows: T[], clear: () => void): ReactNode => (
    <Button
      variant="ghost"
      size="xs"
      className="text-destructive hover:text-destructive"
      onClick={() => {
        removeMany(new Set(rows.map((r) => r.id)), `${rows.length} ${noun}${rows.length === 1 ? "" : "s"}`);
        clear();
      }}
    >
      Delete
    </Button>
  );
