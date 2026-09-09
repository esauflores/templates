import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  container: { overflowX: "auto", position: "relative", width: "100%" },
  table: { borderCollapse: "collapse", fontSize: 14, width: "100%" },
  footer: {
    backgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
    borderTopColor: "var(--border)",
    borderTopStyle: "solid",
    borderTopWidth: 1,
    fontWeight: 500,
  },
  row: {
    borderBottomColor: "var(--border)",
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    transitionDuration: "150ms",
    transitionProperty: "background-color",
  },
  head: {
    fontWeight: 500,
    height: 40,
    paddingInline: 8,
    textAlign: "left",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  cell: { padding: 8, verticalAlign: "middle", whiteSpace: "nowrap" },
  caption: { color: "var(--muted-foreground)", fontSize: 14, marginTop: 16 },
});

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const style = stylex.props(styles.table);
  return (
    <div {...stylex.props(styles.container)} data-slot="table-container">
      <table {...props} {...style} className={cn(style.className, className)} data-slot="table" />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead {...props} className={className} data-slot="table-header" />;
}
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody {...props} className={className} data-slot="table-body" />;
}
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  const style = stylex.props(styles.footer);
  return <tfoot {...props} {...style} className={cn(style.className, className)} data-slot="table-footer" />;
}
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  const style = stylex.props(styles.row);
  return <tr {...props} {...style} className={cn(style.className, className)} data-slot="table-row" />;
}
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  const style = stylex.props(styles.head);
  return <th {...props} {...style} className={cn(style.className, className)} data-slot="table-head" />;
}
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  const style = stylex.props(styles.cell);
  return <td {...props} {...style} className={cn(style.className, className)} data-slot="table-cell" />;
}
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  const style = stylex.props(styles.caption);
  return <caption {...props} {...style} className={cn(style.className, className)} data-slot="table-caption" />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
