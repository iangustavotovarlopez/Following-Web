export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface PageResponse<T> {
  content: T[];
  pagination: PaginationMetadata;
}

export interface IdReference {
  id: number;
}

export interface ActiveResource {
  id: number;
  isActive: boolean;
}
