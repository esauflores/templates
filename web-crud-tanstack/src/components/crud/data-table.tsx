import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { Table, TableBody, TableHeader, TableRow } from "../ui/table";

const styles = stylex.create({
  empty: { color: "var(--muted-foreground)", fontSize: 14, paddingBlock: 40, textAlign: "center" },
  scroll: { overflowX: "auto" },
});

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
    return <p {...stylex.props(styles.empty)}>{empty}</p>;
  }
  return (
    <div {...stylex.props(styles.scroll)}>
      <Table>
        <TableHeader>
          <TableRow>{head}</TableRow>
        </TableHeader>
        <TableBody>{rows.map(render)}</TableBody>
      </Table>
    </div>
  );
}
