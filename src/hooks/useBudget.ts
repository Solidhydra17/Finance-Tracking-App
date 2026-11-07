import { useEffect, useCallback } from 'react';
import { budgetRepository } from '@/storage/indexeddb/budgetRepository';
import type { BudgetPlanUpdate, BudgetItemCreate, BudgetItemUpdate, BudgetPlan } from '@/types';
import { useBudgetStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { db } from '@/storage/indexeddb/database';
import { offerUndo } from '@/lib/undo';

export function useBudget() {
  const { plan, items, isLoading, setPlan, setItems, setLoading } = useBudgetStore(useShallow(state => ({
    plan: state.plan,
    items: state.items,
    isLoading: state.isLoading,
    setPlan: state.setPlan,
    setItems: state.setItems,
    setLoading: state.setLoading
  })));
  const addToast = useUIStore(state => state.addToast);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedPlan = await budgetRepository.getPlan();
      const fetchedItems = await budgetRepository.getItems();
      
      setPlan(fetchedPlan || null);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Failed to load budget data:', error);
      addToast('error', 'Failed to load budget plan');
    } finally {
      setLoading(false);
    }
  }, [setPlan, setItems, setLoading, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePlan = useCallback(async (data: BudgetPlanUpdate | BudgetPlan) => {
    try {
      await budgetRepository.savePlan(data);
      addToast('success', 'Budget plan saved');
      await loadData();
      return true;
    } catch (error) {
      console.error('Failed to save budget plan:', error);
      addToast('error', 'Failed to save budget plan');
      return false;
    }
  }, [addToast, loadData]);

  const createItem = useCallback(async (data: BudgetItemCreate) => {
    try {
      await budgetRepository.createItem(data);
      addToast('success', 'Budget item added');
      await loadData();
      return true;
    } catch (error) {
      console.error('Failed to create budget item:', error);
      addToast('error', 'Failed to add budget item');
      return false;
    }
  }, [addToast, loadData]);

  const updateItem = useCallback(async (id: number, data: BudgetItemUpdate) => {
    try {
      await budgetRepository.updateItem(id, data);
      addToast('success', 'Budget item updated');
      await loadData();
      return true;
    } catch (error) {
      console.error('Failed to update budget item:', error);
      addToast('error', 'Failed to update budget item');
      return false;
    }
  }, [addToast, loadData]);

  const saveCovers = useCallback(async (month: string, shifts: Record<string, number>) => {
    const monthCovers = { month, shifts };
    const now = new Date().toISOString();
    const current = useBudgetStore.getState().plan;
    if (current?.id) {
      await db.budgetPlans.update(current.id, { monthCovers, updatedAt: now });
      setPlan({ ...current, monthCovers, updatedAt: now });
      return;
    }
    const id = await budgetRepository.savePlan({
      grossSalaryCents: 0,
      netSalaryCents: 0,
      payFrequency: 'monthly',
      workDaysPerWeek: 5,
      monthCovers,
    });
    setPlan({
      id,
      grossSalaryCents: 0,
      netSalaryCents: 0,
      payFrequency: 'monthly',
      workDaysPerWeek: 5,
      monthCovers,
      createdAt: now,
      updatedAt: now,
    });
  }, [setPlan]);

  const deleteItem = useCallback(async (id: number) => {
    try {
      const item = items.find((entry) => entry.id === id) ?? await db.budgetItems.get(id);
      await budgetRepository.deleteItem(id);
      setItems(items.filter(i => i.id !== id));
      if (item) {
        offerUndo('Budget item deleted', async () => {
          await db.budgetItems.add(item);
          const current = useBudgetStore.getState().items;
          if (!current.some((entry) => entry.id === item.id)) {
            useBudgetStore.getState().setItems([...current, item]);
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to delete budget item:', error);
      addToast('error', 'Failed to delete budget item');
      return false;
    }
  }, [addToast, items, setItems]);

  return {
    plan,
    items,
    isLoading,
    savePlan,
    createItem,
    updateItem,
    saveCovers,
    deleteItem,
    refetch: loadData,
  };
}
