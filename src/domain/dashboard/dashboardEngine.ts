import type { DashboardData } from './types';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import { loanService } from '@/domain/loans/loanService';
import { recurringEngine } from '@/domain/recurring/recurringEngine';
import { categoryRepository } from '@/storage';
import { FilterState, Transaction } from '@/types';
import { addCents } from '@/lib/money';

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
    ].filter(t => t.type !== 'credit_payment')
     .sort((a, b) => b.date.localeCompare(a.date)) as Transaction[];

    const stats = transactionsEngine.calculateStats(allTransactions);
    const categoryBreakdown = transactionsEngine.getCategoryBreakdown(allTransactions, categories);
    const largestExpense = transactionsEngine.getLargestExpense(allTransactions);

    let loanExposure = 0;
    if (includeLoans) {
      const { totalOwedToYou, totalYouOwe } = await loanService.getTotals();
      loanExposure = totalOwedToYou - totalYouOwe;
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
