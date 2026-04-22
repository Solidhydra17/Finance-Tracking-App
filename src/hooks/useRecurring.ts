import { useState, useEffect, useCallback } from 'react';
import { recurringEngine } from '@/domain/recurring/recurringEngine';
import type { RecurringRule, RecurringRuleCreate, RecurringTransaction } from '@/types';
import { useUIStore } from '@/store';

export function useRecurring() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await recurringEngine.getAll();
      setRules(data);
    } catch (error) {
      console.error('Failed to load recurring rules:', error);
      addToast('error', 'Failed to load recurring rules');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const createRule = useCallback(
    async (data: RecurringRuleCreate) => {
      try {
        await recurringEngine.create(data as RecurringRule);
        addToast('success', 'Recurring rule created');
        await loadRules();
        return true;
      } catch (error) {
        console.error('Failed to create recurring rule:', error);
        addToast('error', 'Failed to create recurring rule');
        return false;
      }
    },
    [addToast, loadRules]
  );

  const updateRule = useCallback(
    async (id: number, data: Partial<RecurringRule>) => {
      try {
        await recurringEngine.update(id, data);
        addToast('success', 'Recurring rule updated');
        await loadRules();
        return true;
      } catch (error) {
        console.error('Failed to update recurring rule:', error);
        addToast('error', 'Failed to update recurring rule');
        return false;
      }
    },
    [addToast, loadRules]
  );

  const deleteRule = useCallback(
    async (id: number) => {
      try {
        await recurringEngine.delete(id);
        addToast('success', 'Recurring rule deleted');
        await loadRules();
        return true;
      } catch (error) {
        console.error('Failed to delete recurring rule:', error);
        addToast('error', 'Failed to delete recurring rule');
        return false;
      }
    },
    [addToast, loadRules]
  );

  const getTransactionsForDateRange = useCallback(
    (startDate: string, endDate: string) => {
      return recurringEngine.computeTransactionsForDateRange(rules, startDate, endDate);
    },
    [rules]
  );

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    getTransactionsForDateRange,
    refetch: loadRules,
  };
}
