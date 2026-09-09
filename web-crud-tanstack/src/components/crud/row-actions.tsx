import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

export const DeleteButton = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button type="button" variant="ghost" size="xs" className="text-destructive hover:text-destructive">
        Delete
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete “{label}”?</AlertDialogTitle>
        <AlertDialogDescription>You can undo this from the toast that appears.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={onConfirm}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const RowActions = ({
  onEdit,
  onDelete,
  onDuplicate,
  deleteLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  deleteLabel: string;
}) => (
  <div className="space-x-1 text-right whitespace-nowrap">
    <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
      Edit
    </Button>
    {onDuplicate ? (
      <Button type="button" variant="ghost" size="xs" onClick={onDuplicate}>
        Duplicate
      </Button>
    ) : null}
    <DeleteButton label={deleteLabel} onConfirm={onDelete} />
  </div>
);
