import type { DashboardData, CategoryBreakdown } from './types';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import { loansEngine } from '@/domain/loans/loansEngine';
import { recurringEngine } from '@/domain/recurring/recurringEngine';
import { categoryRepository } from '@/storage';
import { FilterState } from '@/types';
import { addCents, subtractCents } from '@/lib/money';

export interface DashboardSummary {
  totalBalance: number;
  income: number;
  expenses: number;
  loanExposure: number;
}

export const dashboardEngine = {
  async getDashboardData(filters: FilterState, includeLoans: boolean = false): Promise<DashboardData> {
    const categories = await categoryRepository.getAll();
    const transactions = await transactionsEngine.getByFilters(filters);
    const rules = await recurringEngine.getAll();

    // Include virtual recurring transactions
    const recurringTransactions = recurringEngine.computeTransactionsForDateRange(
      rules,
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );

    // Combine real and virtual transactions
    const allTransactions = [
      ...transactions,
      ...recurringTransactions,
    ].sort((a, b) => b.date.localeCompare(a.date));

    const stats = transactionsEngine.calculateStats(allTransactions);
    const categoryBreakdown = transactionsEngine.getCategoryBreakdown(allTransactions, categories);
    const largestExpense = transactionsEngine.getLargestExpense(allTransactions);

    let loanExposure = 0;
    if (includeLoans) {
      const loans = await loansEngine.getAll();
      const exposure = loansEngine.calculateTotalExposure(loans);
      loanExposure = exposure.net;
    }

    return {
      summary: {
        totalBalance: addCents(stats.netBalance, loanExposure),
        income: stats.totalIncome,
        expenses: stats.totalExpenses,
        loanExposure,
      },
      categoryBreakdown,
      largestExpense,
      transactionCount: allTransactions.length,
    };
  },
};
