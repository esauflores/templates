import * as stylex from "@stylexjs/stylex";
import { cn } from "cn";

const styles = stylex.create({
  skeleton: {
    animationName: "pulse",
    animationDuration: "2s",
    animationIterationCount: "infinite",
    backgroundColor: "var(--accent)",
    borderRadius: 6,
  },
});

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  const style = stylex.props(styles.skeleton);
  return <div {...props} {...style} className={cn(style.className, className)} data-slot="skeleton" />;
}

export { Skeleton };
