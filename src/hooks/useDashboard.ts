import { useState, useEffect, useCallback } from 'react';
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine';
import type { DashboardData } from '@/domain/dashboard/types';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';
import { seedRandomData } from '@/lib/mockDataGenerator';

export function useDashboard(filters: FilterState, showLoans: boolean = false) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast, setFirstLoad } = useUIStore();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const isFirst = useUIStore.getState().isFirstLoad;
      
      // If first load, seed the data and ensure at least 2.5 seconds of loading
      if (isFirst) {
        await seedRandomData(60);
        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      const dashboardData = await dashboardEngine.getDashboardData(filters, showLoans);
      setData(dashboardData);
      setFirstLoad(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      addToast('error', 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showLoans, addToast, setFirstLoad]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, isLoading, refetch: loadDashboard };
}
