import { useState, useEffect, useCallback } from 'react';
import { dashboardEngine, type DashboardData } from '@/domain/dashboard/dashboardEngine';
import type { FilterState } from '@/types';
import { useUIStore } from '@/store';

export function useDashboard(filters: FilterState, showLoans: boolean = false) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const dashboardData = await dashboardEngine.getDashboardData(filters, showLoans);
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
