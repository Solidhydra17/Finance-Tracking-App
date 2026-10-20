import { db } from '@/storage/indexeddb/database';
import { recurringEngine } from './recurringEngine';
import { formatDateLocal, formatTimeLocal, parseDateLocal } from '@/lib/date';

let isProcessing = false;

export const recurringMaterializer = {
  /**
   * Checks all recurring rules and generates real transactions for those that are due.
   * For today's date, the rule's time must have been reached (local clock) before creating.
   */
  async materializeDueTransactions(): Promise<number> {
    if (isProcessing) return 0;
    isProcessing = true;

    try {
      const rules = await db.recurringRules.toArray();
      const now = new Date();
      const todayStr = formatDateLocal(now);
      const nowTime = formatTimeLocal(now);
      let count = 0;

      for (const rule of rules) {
        // If we already materialized through today, nothing left for this open
        if (rule.lastGeneratedDate && rule.lastGeneratedDate >= todayStr) continue;

        const checkStartStr = rule.lastGeneratedDate || rule.startDate;
        const ruleTime = rule.time || '00:00';

        // Start from the day after lastGeneratedDate when we have one,
        // otherwise from the rule start date (inclusive).
        const rangeStart = rule.lastGeneratedDate
          ? (() => {
              const d = parseDateLocal(rule.lastGeneratedDate);
              d.setDate(d.getDate() + 1);
              return d;
            })()
          : parseDateLocal(checkStartStr);

        if (rangeStart > now) continue;

        const dueDates = recurringEngine.generateDates(
          rule.frequency,
          rule.dayOfWeek,
          rule.dayOfMonth,
          rangeStart,
          now,
          rule.selectedDays
        );

        // Past days: always due. Today: only after rule.time (local).
        const newDueDates = dueDates.filter((date) => {
          if (rule.lastGeneratedDate && date <= rule.lastGeneratedDate) return false;
          if (date < todayStr) return true;
          if (date === todayStr) return nowTime >= ruleTime;
          return false;
        });

        if (newDueDates.length === 0) continue;

        for (const date of newDueDates) {
          const transaction: any = {
            type: rule.type,
            amount: rule.amount,
            date: date,
            time: ruleTime,
            categoryId: rule.categoryId,
            note: rule.description || `Recurring ${rule.type}`,
            source: 'recurring',
            recurringRuleId: rule.id,
            walletAccountId: rule.walletAccountId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          };

          await db.transactions.add(transaction);
          count++;
        }

        // Only advance lastGeneratedDate to dates we actually created
        // (do not mark today as done if we skipped it for time)
        const latestDate = newDueDates[newDueDates.length - 1];
        await db.recurringRules.update(rule.id!, {
          lastGeneratedDate: latestDate,
          updatedAt: new Date().toISOString(),
        });
      }

      return count;
    } finally {
      isProcessing = false;
    }
  },
};
