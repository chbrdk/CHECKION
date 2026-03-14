'use client';

import { useRef } from 'react';

/**
 * Returns a ref that tracks the last id we started loading for.
 * Use at the start of a data-loading effect:
 *   if (!id) return;
 *   if (ref.current === id) return;
 *   ref.current = id;
 *   const ac = new AbortController();
 *   // ... fetch with ac.signal, guard setState with !ac.signal.aborted
 *   return () => { ac.abort(); };
 * This prevents duplicate fetches when the effect re-runs (e.g. React Strict Mode) for the same id.
 * When id changes, ref.current !== id so the effect runs again (intended).
 */
export function useFetchOnceForId(): React.MutableRefObject<string | null> {
  return useRef<string | null>(null);
}
