export interface SearchResult<T> {
  item: T;
  score: number;
  matches?: {
    field: string;
    indices: [number, number][];
  }[];
}

export function searchItems<T>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  options?: {
    threshold?: number;
    ignoreCase?: boolean;
  }
): SearchResult<T>[] {
  if (!query.trim()) {
    return items.map(item => ({ item, score: 0 }));
  }

  const { threshold = 0.3, ignoreCase = true } = options || {};
  const searchQuery = ignoreCase ? query.toLowerCase() : query;

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    let maxScore = 0;
    const matches: SearchResult<T>['matches'] = [];

    for (const field of searchFields) {
      const value = item[field];
      if (value === null || value === undefined) continue;

      const stringValue = String(value);
      const searchTarget = ignoreCase ? stringValue.toLowerCase() : stringValue;

      // Simple substring matching for fuzzy search
      let fieldScore = 0;
      const indices: [number, number][] = [];

      let queryIndex = 0;
      for (let i = 0; i < searchTarget.length && queryIndex < searchQuery.length; i++) {
        if (searchTarget[i] === searchQuery[queryIndex]) {
          indices.push([i, i]);
          fieldScore += 1;
          queryIndex++;
        }
      }

      if (queryIndex === searchQuery.length) {
        // Full match found
        fieldScore = fieldScore / searchTarget.length;
        if (fieldScore >= threshold) {
          maxScore = Math.max(maxScore, fieldScore);
          matches.push({ field: String(field), indices });
        }
      }
    }

    if (maxScore > 0) {
      results.push({ item, score: maxScore, matches });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
