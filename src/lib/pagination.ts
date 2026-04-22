export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      startIndex: total > 0 ? startIndex + 1 : 0,
      endIndex,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function createPaginationState(pageSize = 20): PaginationState {
  return {
    page: 1,
    pageSize,
    total: 0,
  };
}
