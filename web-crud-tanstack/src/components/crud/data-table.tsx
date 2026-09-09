import type { ReactNode } from "react";

import { Table, TableBody, TableHeader, TableRow } from "../ui/table";

export function DataTable<T>({
  head,
  rows,
  render,
  empty,
}: {
  head: ReactNode;
  rows: T[];
  render: (row: T) => ReactNode;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{head}</TableRow>
        </TableHeader>
        <TableBody>{rows.map(render)}</TableBody>
      </Table>
    </div>
  );
}
