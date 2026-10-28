import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small data-loading hook with loading/error state and refresh support.
 * Keeps the previous stale data visible while refreshing to avoid layout jumps.
 */
export function useAsync(loader, deps = [], { immediate = true } = {}) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);
  const [state, setState] = useState({ data: null, error: null, loading: immediate });

  const run = useCallback(async (options = {}) => {
    const id = requestId.current + 1;
    requestId.current = id;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loaderRef.current(options);
      if (requestId.current === id) {
        setState({ data, error: null, loading: false });
      }
      return data;
    } catch (error) {
      if (requestId.current === id) {
        setState((current) => ({ ...current, error, loading: false }));
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => {});
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((current) => ({
      ...current,
      data: typeof updater === 'function' ? updater(current.data) : updater,
    }));
  }, []);

  return { ...state, refresh: run, setData };
}

export default useAsync;
