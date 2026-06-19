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
        
        if (result.has(item.categoryId)) {
          const existing = result.get(item.categoryId)!;
          existing.plannedCents += plannedCents;
          existing.differenceCents = Math.abs(existing.plannedCents - existing.actualCents);
          existing.isOverBudget = existing.actualCents > existing.plannedCents;
        } else {
          result.set(item.categoryId, {
            plannedCents,
            actualCents,
            differenceCents: Math.abs(plannedCents - actualCents),
            isOverBudget: actualCents > plannedCents
          });
        }
      }
    }

    return result;
  },

  calculateCutoffAllocations(
    items: BudgetItem[],
    workDaysPerWeek: number,
    netSalaryCents: number,
    cutoff1AmountCents?: number,
    cutoff2AmountCents?: number
  ) {
    const c1Income = cutoff1AmountCents || Math.floor(netSalaryCents / 2);
    const c2Income = cutoff2AmountCents || Math.ceil(netSalaryCents / 2);

    let c1Reserved = 0;
    let c2Reserved = 0;

    type AllocatedItem = BudgetItem & { allocatedMonthlyCents: number };

    const c1Fixed: AllocatedItem[] = [];
    const c2Fixed: AllocatedItem[] = [];
    const c1Variable: AllocatedItem[] = [];
    const c2Variable: AllocatedItem[] = [];

    const totalIncome = c1Income + c2Income;
    const ratio1 = totalIncome > 0 ? c1Income / totalIncome : 0.5;

    for (const item of items) {
      if (!item.active) continue;

      const monthlyAmount = this.calculateMonthlyAmount(item, workDaysPerWeek);

      if (item.dueDay !== undefined) {
        // Fixed bills with dueDay use due-date allocation
        // Cutoff 1 (usually 15th) is responsible for items due from 16 to end of month.
        // Cutoff 2 (usually 30th) is responsible for items due from 1 to 15.
        if (item.dueDay >= 16) {
          c1Fixed.push({ ...item, allocatedMonthlyCents: monthlyAmount });
          c1Reserved += monthlyAmount;
        } else {
          c2Fixed.push({ ...item, allocatedMonthlyCents: monthlyAmount });
          c2Reserved += monthlyAmount;
        }
      } else {
        // Variable expenses without dueDay are allocated proportionally across cutoffs
        const amount1 = Math.round(monthlyAmount * ratio1);
        const amount2 = monthlyAmount - amount1;

        if (amount1 > 0) {
          c1Variable.push({ ...item, allocatedMonthlyCents: amount1 });
          c1Reserved += amount1;
        }
        if (amount2 > 0) {
          c2Variable.push({ ...item, allocatedMonthlyCents: amount2 });
          c2Reserved += amount2;
        }
      }
    }

    return {
      cutoff1: {
        incomeCents: c1Income,
        reservedCents: c1Reserved,
        freeCents: c1Income - c1Reserved,
        fixedItems: c1Fixed,
        variableItems: c1Variable
      },
      cutoff2: {
        incomeCents: c2Income,
        reservedCents: c2Reserved,
        freeCents: c2Income - c2Reserved,
        fixedItems: c2Fixed,
        variableItems: c2Variable
      }
    };
  }
};
