import type { Transaction } from '@/types';
import type { CategoryBreakdown } from '@/domain/transactions/transactionsEngine';

export interface DashboardSummary {
  totalBalance: number;
  income: number;
  expenses: number;
  loanExposure: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  categoryBreakdown: CategoryBreakdown[];
  largestExpense: Transaction | null;
  transactionCount: number;
}
