import { db } from '@/storage/indexeddb/database';
import { recurringEngine } from './recurringEngine';
import type { RecurringRule, Transaction } from '@/types';
import { formatDateLocal } from '@/lib/date';

let isProcessing = false;

export const recurringMaterializer = {
  /**
   * Checks all recurring rules and generates real transactions for those that are due.
   */
  async materializeDueTransactions(): Promise<number> {
    if (isProcessing) return 0;
    isProcessing = true;
    
    try {
      const rules = await db.recurringRules.toArray();
    const today = new Date();
    const todayStr = formatDateLocal(today);
    let count = 0;

    for (const rule of rules) {
      // Determine the range to check: from the last generated date (or rule start) until today
      const checkStartStr = rule.lastGeneratedDate || rule.startDate;
      
      // If the last generated date is today or later, skip
      if (rule.lastGeneratedDate && rule.lastGeneratedDate >= todayStr) continue;

      // Generate all due dates for this rule up to today
      const dueDates = recurringEngine.generateDates(
        rule.frequency,
        rule.dayOfWeek,
        rule.dayOfMonth,
        new Date(checkStartStr),
        today
      );

      // Filter out dates that have already been generated
      const newDueDates = dueDates.filter(date => !rule.lastGeneratedDate || date > rule.lastGeneratedDate);

      if (newDueDates.length === 0) continue;

      // Create a transaction for each new due date
      for (const date of newDueDates) {
        const transaction: any = {
          type: rule.type,
          amount: rule.amount,
          date: date,
          categoryId: rule.categoryId,
          note: rule.description || `Recurring ${rule.type}`,
          source: 'recurring',
          recurringRuleId: rule.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        };

        await db.transactions.add(transaction);
        count++;
      }

      // Update the rule with the latest generated date
      const latestDate = newDueDates[newDueDates.length - 1];
      await db.recurringRules.update(rule.id!, {
        lastGeneratedDate: latestDate,
        updatedAt: new Date().toISOString()
      });
    }

    return count;
    } finally {
      isProcessing = false;
    }
  }
};
