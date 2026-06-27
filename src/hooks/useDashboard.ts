import { useState, useEffect, useCallback } from 'react';
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine';
import type { DashboardData } from '@/domain/dashboard/types';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';
import { seedRandomData } from '@/lib/mockDataGenerator';

export function useDashboard(filters: FilterState, showLoans: boolean = false) {
  const { addToast, setFirstLoad, cachedDashboardData, setCachedDashboardData } = useUIStore();
  
  // Initialize from cache if available
  const [data, setData] = useState<DashboardData | null>(cachedDashboardData);
  const [isLoading, setIsLoading] = useState(!cachedDashboardData);

  const loadDashboard = useCallback(async () => {
    // Only show loading state if there's no cached data to display
    if (!cachedDashboardData) {
      setIsLoading(true);
    }
    
    try {
      const isFirst = useUIStore.getState().isFirstLoad;
      const useMock = useUIStore.getState().useMockData;
      
      // If first load and mock data is enabled, seed the data
      if (isFirst && useMock) {
        try {
          await seedRandomData(60);
          // Ensure at least 2.5 seconds of loading for the "Funny Loading Screen"
          await new Promise(resolve => setTimeout(resolve, 2500));
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
  }, [filters, showLoans, addToast, setFirstLoad, cachedDashboardData, setCachedDashboardData]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, isLoading, refetch: loadDashboard };
}
