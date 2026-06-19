import { useEffect, useCallback } from 'react';
import { budgetRepository } from '@/storage/indexeddb/budgetRepository';
import type { BudgetPlanUpdate, BudgetItemCreate, BudgetItemUpdate, BudgetPlan } from '@/types';
import { useBudgetStore, useUIStore } from '@/store';

export function useBudget() {
  const { plan, items, isLoading, setPlan, setItems, setLoading } = useBudgetStore();
  const { addToast } = useUIStore();

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

  const deleteItem = useCallback(async (id: number) => {
    try {
      await budgetRepository.deleteItem(id);
      addToast('success', 'Budget item deleted');
      await loadData();
      return true;
    } catch (error) {
      console.error('Failed to delete budget item:', error);
      addToast('error', 'Failed to delete budget item');
      return false;
    }
  }, [addToast, loadData]);

  return {
    plan,
    items,
    isLoading,
    savePlan,
    createItem,
    updateItem,
    deleteItem,
    refetch: loadData,
  };
}
