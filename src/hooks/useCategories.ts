import { useState, useEffect, useCallback } from 'react';
import { categoryRepository, seedDefaultCategories } from '@/storage/indexeddb';
import type { Category } from '@/types';
import { useUIStore } from '@/store';

export function useCategories(type?: 'income' | 'expense' | 'both') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      await seedDefaultCategories();
      const cats = type
        ? await categoryRepository.getByType(type)
        : await categoryRepository.getAll();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      addToast('error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getCategoryById = useCallback(
    (id: number) => categories.find((c) => c.id === id),
    [categories]
  );

  return { categories, isLoading, getCategoryById, refetch: loadCategories };
}
