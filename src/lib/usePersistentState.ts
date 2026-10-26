// usePersistentState.ts — a localStorage-backed state hook that degrades
// gracefully. Reads/writes are wrapped in try/catch so private windows,
// blocked storage, or SSR never break the component; it just uses the default.

import { useCallback, useEffect, useState } from "react";

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — keep in-memory value */
    }
  }, [key, value]);

  const set = useCallback((v: T) => setValue(v), []);
  return [value, set];
}
