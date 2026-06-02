"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "auris.watchlist";

/**
 * localStorage-backed cross-screener watchlist. Items are keyed by
 * "<kind>:<id>" — e.g. "mf:120586", "etf:118819", "crypto:bitcoin" —
 * so the same hook can serve all three screeners without collisions.
 *
 * SSR-safe: starts empty, hydrates from storage on mount, and broadcasts
 * changes via the `storage` event so multiple table instances on the
 * same page stay in sync.
 */
export function useWatchlist() {
  const [items, setItems] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(new Set(JSON.parse(raw)));
    } catch {
      // ignore corrupt JSON or SecurityError in private mode
    }
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        setItems(new Set(e.newValue ? JSON.parse(e.newValue) : []));
      } catch {
        // ignore
      }
    };
    // Also listen for same-tab updates from sibling tables.
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (detail) setItems(new Set(detail));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auris:watchlist", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auris:watchlist", onCustom);
    };
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setItems(next);
    try {
      const arr = Array.from(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent("auris:watchlist", { detail: arr }));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        const arr = Array.from(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        window.dispatchEvent(new CustomEvent("auris:watchlist", { detail: arr }));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const has = useCallback((id: string) => items.has(id), [items]);

  const clearAll = useCallback(() => persist(new Set()), [persist]);

  return { has, toggle, clearAll, count: items.size, hydrated };
}
