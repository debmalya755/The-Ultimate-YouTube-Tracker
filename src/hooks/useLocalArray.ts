import { useCallback, useEffect, useState } from "react";

const newId = (p: string) =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export { newId };

export function useLocalArray<T extends { id: string }>(
  key: string,
  guard: (v: unknown) => v is T
) {
  const [rows, setRows] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      setRows(Array.isArray(parsed) ? parsed.filter(guard) : []);
    } catch {
      setRows([]);
    }
    setHydrated(true);
  }, [key, guard]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      /* ignore */
    }
  }, [rows, hydrated, key]);

  const add = useCallback((draft: Omit<T, "id"> & { id?: string }) => {
    const row = { ...draft, id: draft.id ?? newId("r") } as T;
    setRows((cur) => [...cur, row]);
    return row.id;
  }, []);

  const update = useCallback((id: string, draft: Partial<T>) => {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...draft } : r)));
  }, []);

  const remove = useCallback((id: string) => {
    setRows((cur) => cur.filter((r) => r.id !== id));
  }, []);

  return { rows, add, update, remove, hydrated };
}
