import { useState, useEffect, useCallback } from 'react';
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine';
import type { DashboardData } from '@/domain/dashboard/types';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';

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
