import { Button } from "../ui/button";
import { DialogClose, DialogFooter } from "../ui/dialog";

export const FormFooter = ({ submitLabel, disabled }: { submitLabel: string; disabled?: boolean }) => (
  <DialogFooter>
    <DialogClose asChild>
      <Button type="button" variant="outline">
        Cancel
      </Button>
    </DialogClose>
    <Button type="submit" disabled={disabled}>
      {submitLabel}
    </Button>
  </DialogFooter>
);
