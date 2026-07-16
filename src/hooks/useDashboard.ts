import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine';
import type { DashboardData } from '@/domain/dashboard/types';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';
import { seedRandomData } from '@/lib/mockDataGenerator';

export function useDashboard(filters: FilterState, showLoans: boolean = false) {
  const addToast = useUIStore(state => state.addToast);
  const setFirstLoad = useUIStore(state => state.setFirstLoad);
  const setCachedDashboardData = useUIStore(state => state.setCachedDashboardData);

  // Use a ref to read cachedDashboardData without making it a dependency.
  // This breaks the infinite loop: fetch -> cache update -> new callback -> useEffect -> fetch again.
  const cachedDashboardDataRef = useRef(useUIStore.getState().cachedDashboardData);
  useEffect(() => {
    return useUIStore.subscribe(state => {
      cachedDashboardDataRef.current = state.cachedDashboardData;
    });
  }, []);

  const [data, setData] = useState<DashboardData | null>(cachedDashboardDataRef.current);
  const [isLoading, setIsLoading] = useState(!cachedDashboardDataRef.current);

  const loadDashboard = useCallback(async () => {
    // Only show loading state if there's no cached data to display
    if (!cachedDashboardDataRef.current) {
      setIsLoading(true);
    }

    try {
      const isFirst = useUIStore.getState().isFirstLoad;
      const useMock = useUIStore.getState().useMockData;

      // If first load and mock data is enabled, seed the data
      if (isFirst && useMock) {
        try {
          await seedRandomData(60);
        } catch (seedError) {
          console.warn('Seeding failed, continuing with existing data...', seedError);
        }
      }

      const { recurringMaterializer } = await import('@/domain/recurring/materializer');
      await recurringMaterializer.materializeDueTransactions();

      const dashboardData = await dashboardEngine.getDashboardData(filters, showLoans);
      setData(dashboardData);
      setCachedDashboardData(dashboardData);
      setFirstLoad(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      addToast('error', 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  // cachedDashboardData is intentionally excluded from deps — read via ref to prevent loop
  }, [filters, showLoans, addToast, setFirstLoad, setCachedDashboardData]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, isLoading, refetch: loadDashboard };
}
