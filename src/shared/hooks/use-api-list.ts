import { useCallback, useEffect, useState } from 'react';
import type { PageResponse } from '../api';

export function useApiList<T>(loader: () => Promise<PageResponse<T> | null>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((response) => {
        if (active) {
          setData(response?.content ?? []);
        }
      })
      .catch((cause: Error) => {
        if (active) {
          setError(cause.message);
          setData([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loader, refreshKey]);

  return { data, loading, error, refresh };
}
