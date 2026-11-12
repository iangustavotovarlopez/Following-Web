import { useEffect, useRef } from 'react';
import { API_MUTATION_EVENT, type ApiMutationDetail, type PageResponse } from '../../../shared/api';
import { useCatalogPages } from '../../../shared/hooks/use-catalog-pages';

export function useRequirementCatalog<T>(key: string, enabled: boolean, loader: (page: number) => Promise<PageResponse<T> | null>,
  collectionPaths: string[] = []) {
  const catalog = useCatalogPages(key, enabled, loader);
  const pathKey = collectionPaths.join('|');
  useEffect(() => {
    const paths = pathKey.split('|').filter(Boolean);
    function onMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (paths.some((collection) => {
        if (path === collection) return true;
        if (!path.startsWith(`${collection}/`)) return false;
        const itemPath = path.slice(collection.length + 1);
        return /^\d+$/.test(itemPath)
          || (collection === '/staffing/v0/staffing' && /^\d+\/assignments(?:\/\d+)?$/.test(itemPath));
      })) catalog.refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, [pathKey, catalog.refresh]);
  return catalog;
}

export function useRequirementMounted() {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return mounted;
}
