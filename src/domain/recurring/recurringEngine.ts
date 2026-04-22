import type { RecurringRule, RecurringTransaction } from '@/types';
import { recurringRepository } from '@/storage/indexeddb';

export const recurringEngine = {
  async getAll(): Promise<RecurringRule[]> {
    return recurringRepository.getAll();
  },

  async getById(id: number): Promise<RecurringRule | undefined> {
    return recurringRepository.getById(id);
  },

  async create(data: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return recurringRepository.create(data as RecurringRule);
  },

  async update(id: number, data: Partial<RecurringRule>): Promise<number> {
    return recurringRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    return recurringRepository.delete(id);
  },

  computeTransactionsForDateRange(
    rules: RecurringRule[],
    startDate: string,
    endDate: string
  ): RecurringTransaction[] {
    const transactions: RecurringTransaction[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const rule of rules) {
      const ruleStart = new Date(rule.startDate);
      const ruleEnd = rule.endDate ? new Date(rule.endDate) : null;

      // Determine the effective date range
      const effectiveStart = ruleStart > start ? ruleStart : start;
      const effectiveEnd = ruleEnd && ruleEnd < end ? ruleEnd : end;

      if (effectiveStart > effectiveEnd) continue;

      const generatedDates = this.generateDates(
        rule.frequency,
        rule.dayOfWeek,
        rule.dayOfMonth,
        effectiveStart,
        effectiveEnd
      );

      for (const date of generatedDates) {
        transactions.push({
          date,
          amount: rule.amount,
          categoryId: rule.categoryId,
          type: rule.type,
          description: rule.description,
          source: 'recurring',
          recurringRuleId: rule.id!,
        });
      }
    }

    return transactions.sort((a, b) => b.date.localeCompare(a.date));
  },

  generateDates(
    frequency: 'weekly' | 'monthly',
    dayOfWeek: number | null,
    dayOfMonth: number | null,
    startDate: Date,
    endDate: Date
  ): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);

    if (frequency === 'weekly' && dayOfWeek !== null) {
      // Find the first occurrence of the day of week
      while (current.getDay() !== dayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7);
      }
    } else if (frequency === 'monthly' && dayOfMonth !== null) {
      // Set to the specified day of month
      current.setDate(dayOfMonth);

      // If we're past this month's day, move to next month
      if (current < startDate) {
        current.setMonth(current.getMonth() + 1);
      }

      while (current <= endDate) {
        // Handle months with fewer days
        if (current.getDate() === dayOfMonth) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  },
};
