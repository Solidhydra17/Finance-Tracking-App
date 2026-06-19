import type { BudgetItem } from '@/types';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';

export interface PlannedVsActual {
  plannedCents: number;
  actualCents: number;
  differenceCents: number;
  isOverBudget: boolean;
}

export const budgetEngine = {
  calculateMonthlyAmount(item: BudgetItem, workDaysPerWeek: number): number {
    const amount = item.amountCents;
    switch (item.frequency) {
      case 'day':
        if (item.useWorkSchedule) {
          return Math.round(amount * workDaysPerWeek * 4.33);
        }
        return Math.round(amount * 30.4);
      case 'week':
        return Math.round(amount * 4.33);
      case 'biweekly':
        return Math.round((amount * 26) / 12);
      case 'month':
        return amount;
      default:
        return amount;
    }
  },

  calculateAllocated(items: BudgetItem[], workDaysPerWeek: number): number {
    let total = 0;
    for (const item of items) {
      if (item.active) {
        total += this.calculateMonthlyAmount(item, workDaysPerWeek);
      }
    }
    return total;
  },

  calculateFinancialHealth(netSalaryCents: number, allocatedCents: number): 'Healthy' | 'Tight' | 'Deficit' {
    if (netSalaryCents <= 0) return 'Healthy'; // Avoid division by zero
    const percentage = allocatedCents / netSalaryCents;
    if (percentage <= 0.8) return 'Healthy';
    if (percentage <= 1.0) return 'Tight';
    return 'Deficit';
  },

  async getPlannedVsActual(
    items: BudgetItem[],
    workDaysPerWeek: number,
    targetMonth: Date = new Date()
  ): Promise<Map<number, PlannedVsActual>> {
    // Determine start and end of target month
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Fetch transactions for the target month
    const transactions = await transactionsEngine.getByFilters({
      dateRange: { preset: 'custom', startDate, endDate },
      categoryId: null,
      transactionType: 'expense',
      loanOnly: false,
      searchQuery: '',
    });

    const actualMap = new Map<number, number>();
    for (const t of transactions) {
      if (t.categoryId) {
        actualMap.set(t.categoryId, (actualMap.get(t.categoryId) || 0) + t.amount);
      }
    }

    const result = new Map<number, PlannedVsActual>();
    for (const item of items) {
      if (item.active && item.categoryId && item.type === 'expense') {
        const plannedCents = this.calculateMonthlyAmount(item, workDaysPerWeek);
        const actualCents = actualMap.get(item.categoryId) || 0;
        const differenceCents = plannedCents - actualCents;
        
        result.set(item.id!, {
          plannedCents,
          actualCents,
          differenceCents: Math.abs(differenceCents),
          isOverBudget: actualCents > plannedCents
        });
      }
    }

    return result;
  }
};
