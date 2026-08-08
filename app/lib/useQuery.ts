/*
  A very small async-data hook — enough for this dashboard, without pulling in
  a data-fetching library.

  `useQuery` runs the fetcher on mount and whenever `deps` change, ignores
  results from a run that has been superseded, and hands back a `reload` so
  mutations can refresh the panel they just changed.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isSupabaseConfigured } from "./supabase";

export type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Optimistic local edit; the next reload overwrites it. */
  setData: (updater: (current: T | null) => T | null) => void;
};

export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): QueryState<T> {
  const enabled = options.enabled ?? true;
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled && isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Bumped on every run so a slow earlier request can't overwrite a newer one.
  const runId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (id !== runId.current) return;
        setDataState(result);
      })
      .catch((err) => {
        if (id !== runId.current) return;
        setError(errorMessage(err, "Couldn't load this data."));
      })
      .finally(() => {
        if (id !== runId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setDataState((current) => updater(current));
  }, []);

  return { data, loading, error, reload, setData };
}

/**
 * Wraps a mutation with busy/error state so forms don't each reimplement it.
 * Returns `true` when the mutation succeeded.
 */
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorMessage(err, "That action didn't go through."));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
