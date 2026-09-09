import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";
import * as React from "react";

const styles = stylex.create({
  card: {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: 12,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--card-foreground)",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    paddingBlock: 24,
  },
  header: { display: "grid", gap: 8, paddingInline: 24 },
  title: { fontWeight: 600, lineHeight: 1 },
  description: { color: "var(--muted-foreground)", fontSize: 14 },
  action: { alignSelf: "start", gridColumnStart: 2, gridRow: "span 2 / span 2", gridRowStart: 1, justifySelf: "end" },
  content: { paddingInline: 24 },
  footer: { alignItems: "center", display: "flex", paddingInline: 24 },
});

function Card({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.card);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card" />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.header);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-header" />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.title);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-title" />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.description);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-description" />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.action);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-action" />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.content);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-content" />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.footer);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="card-footer" />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
