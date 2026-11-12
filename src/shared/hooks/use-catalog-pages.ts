import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCatalogPages, type PageResponse } from '../api';

interface CatalogState<T> {
  key: string;
  enabled: boolean;
  items: T[];
  loading: boolean;
  error: string | null;
}

export function useCatalogPages<T>(
  key: string,
  enabled: boolean,
  loader: (page: number) => Promise<PageResponse<T> | null>,
) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const [state, setState] = useState<CatalogState<T>>({ key, enabled, items: [], loading: enabled, error: null });

  useEffect(() => {
    let active = true;
    setState({ key, enabled, items: [], loading: enabled, error: null });
    if (!enabled) return () => { active = false; };
    const request = loaderRef.current;
    void loadCatalogPages(request).then((items) => {
      if (active) setState({ key, enabled, items, loading: false, error: null });
    }).catch((cause) => {
      if (active) setState({ key, enabled, items: [], loading: false,
        error: cause instanceof Error ? cause.message : 'No se pudo consultar el catalogo.' });
    });
    return () => { active = false; };
  }, [key, enabled, revision]);

  if (state.key !== key || state.enabled !== enabled) {
    return { items: [], loading: enabled, error: null, refresh };
  }
  return { items: state.items, loading: state.loading, error: state.error, refresh };
}
