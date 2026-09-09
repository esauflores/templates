import { useCallback, useRef, useState } from "react";
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

const apply = <T extends { id: string }>(items: T[], change: CrudChange<T>) => {
  if (change.type === "create") return [change.item, ...items];
  if (change.type === "update")
    return items.map((item) => (item.id === change.id ? { ...item, ...change.patch } : item));
  return items.filter((item) => !change.ids.includes(item.id));
};

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
  const confirmed = useRef(seed);
  const pending = useRef<CrudChange<T>[]>([]);
  const visible = useRef(seed);
  // ponytail: serialize one list's writes; use per-record rebase only if mutation throughput matters.
  const queue = useRef(Promise.resolve());

  const publish = useCallback(() => {
    const next = pending.current.reduce(apply<T>, confirmed.current);
    visible.current = next;
    setItems(next);
  }, []);

  const enqueue = useCallback(
    (change: CrudChange<T>, onSuccess?: () => void, onError?: (err: unknown) => void) => {
      pending.current.push(change);
      publish();
      queue.current = queue.current.then(async () => {
        try {
          await persist(change);
          confirmed.current = apply(confirmed.current, change);
          onSuccess?.();
        } catch (err) {
          onError?.(err);
        } finally {
          pending.current = pending.current.filter((pendingChange) => pendingChange !== change);
          publish();
        }
      });
    },
    [persist, publish],
  );

  const create = useCallback(
    (draft: Omit<T, "id">, label: string) => {
      const item = { ...draft, id: crypto.randomUUID() } as T;
      enqueue(
        { type: "create", item },
        () => toast.success(`Created ${noun} “${label}”`),
        (err) => toast.error(reason(err, `Couldn't create ${noun}`)),
      );
    },
    [enqueue, noun],
  );

  const update = useCallback(
    (id: string, patch: Partial<T>, label: string) => {
      enqueue(
        { type: "update", id, patch },
        () => toast.success(`Updated ${noun} “${label}”`),
        (err) => toast.error(reason(err, `Couldn't update ${noun}`)),
      );
    },
    [enqueue, noun],
  );

  const drop = useCallback(
    (ids: Set<string>, label: string) => {
      const deleted = visible.current.filter((item) => ids.has(item.id));
      enqueue(
        { type: "delete", ids: [...ids] },
        () =>
          toast.success(`Deleted ${label}`, {
            action: {
              label: "Undo",
              onClick: () =>
                deleted.forEach((item) =>
                  enqueue({ type: "create", item }, undefined, (err) =>
                    toast.error(reason(err, `Couldn't restore ${noun}`)),
                  ),
                ),
            },
          }),
        (err) => toast.error(reason(err, `Couldn't delete ${label}`)),
      );
    },
    [enqueue, noun],
  );

  const remove = useCallback((id: string, label: string) => drop(new Set([id]), `${noun} “${label}”`), [drop, noun]);

  /** Bulk delete — pass a `Set` of ids and a human label (e.g. "3 customers"). */
  const removeMany = useCallback((ids: Set<string>, label: string) => drop(ids, label), [drop]);

  return { items, create, update, remove, removeMany };
}
