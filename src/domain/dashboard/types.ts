import type { DashboardSummary, CategoryBreakdown } from './dashboardEngine';
import type { Transaction } from '@/types';

export interface DashboardData {
  summary: DashboardSummary;
  categoryBreakdown: CategoryBreakdown[];
  largestExpense: Transaction | null;
  transactionCount: number;
}

export type { DashboardSummary, CategoryBreakdown };
