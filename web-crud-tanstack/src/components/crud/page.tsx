import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";

/** Thin wrapper over the shadcn Dialog — the page owns `open` state. */
export const CrudDialog = ({
  title,
  trigger,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  trigger?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);
