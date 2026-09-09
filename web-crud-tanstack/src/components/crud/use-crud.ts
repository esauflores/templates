import { useCallback, useState } from "react";
import { toast } from "sonner";

/** The change to send to your API. Shape it however your backend wants. */
export type CrudChange<T> =
  | { type: "create"; item: T }
  | { type: "update"; id: string; patch: Partial<T> }
  | { type: "delete"; ids: string[] };

type Options<T> = {
  /**
   * Persist a change to your backend. Resolve on success, **reject to trigger a
   * rollback + error toast**. Omit for the in-memory demo (always succeeds).
   * Wrap it in `useCallback` if you pass one.
   */
  persist?: (change: CrudChange<T>) => Promise<void>;
};

const NOOP = () => Promise.resolve();
const reason = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/**
 * Optimistic in-memory CRUD store. Every mutation updates state immediately,
 * then awaits `persist`; on failure it rolls back and shows an error toast.
 * `remove` / `removeMany` also offer an **Undo** action on the success toast.
 *
 * Swap `persist` for real API calls — the components that consume
 * `{ items, create, update, remove, removeMany }` don't change.
 */
export function useCrud<T extends { id: string }>(seed: T[], noun: string, { persist = NOOP }: Options<T> = {}) {
  const [items, setItems] = useState<T[]>(seed);

  const create = useCallback(
    (draft: Omit<T, "id">, label: string) => {
      const item = { ...draft, id: crypto.randomUUID() } as T;
      setItems((prev) => [item, ...prev]);
      persist({ type: "create", item })
        .then(() => toast.success(`Created ${noun} “${label}”`))
        .catch((err) => {
          setItems((prev) => prev.filter((it) => it.id !== item.id));
          toast.error(reason(err, `Couldn't create ${noun}`));
        });
    },
    [noun, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<T>, label: string) => {
      let prevRow: T | undefined;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          prevRow = it;
          return { ...it, ...patch };
        }),
      );
      persist({ type: "update", id, patch })
        .then(() => toast.success(`Updated ${noun} “${label}”`))
        .catch((err) => {
          if (prevRow) setItems((prev) => prev.map((it) => (it.id === id ? (prevRow as T) : it)));
          toast.error(reason(err, `Couldn't update ${noun}`));
        });
    },
    [noun, persist],
  );

  const drop = useCallback(
    (ids: Set<string>, label: string) => {
      let snapshot: T[] = [];
      setItems((prev) => {
        snapshot = prev;
        return prev.filter((it) => !ids.has(it.id));
      });
      persist({ type: "delete", ids: [...ids] })
        .then(() =>
          toast.success(`Deleted ${label}`, {
            action: { label: "Undo", onClick: () => setItems(snapshot) },
          }),
        )
        .catch((err) => {
          setItems(snapshot);
          toast.error(reason(err, `Couldn't delete ${label}`));
        });
    },
    [persist],
  );

  const remove = useCallback((id: string, label: string) => drop(new Set([id]), `${noun} “${label}”`), [drop, noun]);

  /** Bulk delete — pass a `Set` of ids and a human label (e.g. "3 customers"). */
  const removeMany = useCallback((ids: Set<string>, label: string) => drop(ids, label), [drop]);

  return { items, create, update, remove, removeMany };
}
