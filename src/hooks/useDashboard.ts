import { useState, useEffect, useCallback } from 'react';
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine';
import type { DashboardData } from '@/domain/dashboard/types';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';
import { seedRandomData } from '@/lib/mockDataGenerator';

const DELAY_MS = 5000;

export function useDashboard(filters: FilterState, showLoans: boolean = false) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    
    // Artificial delay to see the loading state
    const delayPromise = new Promise(resolve => setTimeout(resolve, DELAY_MS));

    try {
      // Randomize data on load (or whenever this is triggered)
      // We only randomize on the very first load to avoid confusing behavior on filter changes,
      // UNLESS the user wants it every time. Let's do it every time as requested for "different types of data".
      await seedRandomData(25);
      
      const [dashboardData] = await Promise.all([
        dashboardEngine.getDashboardData(filters, showLoans),
        delayPromise
      ]);
      
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      addToast('error', 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [filters, showLoans, addToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return { data, isLoading, refetch: loadDashboard };
}
