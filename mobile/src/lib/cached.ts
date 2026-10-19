import { useCallback, useState } from "react";
import { peek } from "./api";

/**
 * Screen data that starts from the last answer for `path` (instant when the screen was seen
 * before) and ignores a refresh that brings the same data, so forms filled from it are not
 * reset while the creator types.
 */
export function useCached<T>(path: string, pick: (raw: unknown) => T = (raw) => raw as T) {
  const [data, setRaw] = useState<T | null>(() => {
    const raw = peek(path);
    return raw === undefined ? null : pick(raw);
  });
  const setData = useCallback((next: T | null | ((prev: T | null) => T | null)) => {
    setRaw((prev) => {
      const value = typeof next === "function" ? (next as (prev: T | null) => T | null)(prev) : next;
      return prev !== null && value !== null && JSON.stringify(prev) === JSON.stringify(value) ? prev : value;
    });
  }, []);
  return [data, setData] as const;
}
