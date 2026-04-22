import { useRef, useCallback } from 'react';

export function useButtonGuard() {
  const isLoadingRef = useRef(false);

  const guardCallback = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (isLoadingRef.current) {
      return null;
    }
    isLoadingRef.current = true;
    try {
      return await fn();
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const isLoading = isLoadingRef.current;

  return { guardCallback, isLoading };
}

export function createButtonGuard() {
  let isLoading = false;

  const wrap = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (isLoading) return null;
    isLoading = true;
    try {
      return await fn();
    } finally {
      isLoading = false;
    }
  };

  const getIsLoading = () => isLoading;

  return { wrap, getIsLoading };
}
