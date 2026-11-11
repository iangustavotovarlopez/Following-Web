import type { PageResponse } from './types';

export async function loadCatalogPages<T>(request: (page: number) => Promise<PageResponse<T> | null>) {
  const items: T[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await request(page);
    if (response === null) break;
    items.push(...response.content);
    totalPages = response.pagination.totalPages;
  }
  return items;
}
