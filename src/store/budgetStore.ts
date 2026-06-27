import { create } from 'zustand';
import type { BudgetPlan, BudgetItem } from '@/types';

interface BudgetState {
  plan: BudgetPlan | null;
  items: BudgetItem[];
  isLoading: boolean;
  setPlan: (plan: BudgetPlan | null) => void;
  setItems: (items: BudgetItem[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  plan: null,
  items: [],
  isLoading: false,
  setPlan: (plan) => set({ plan }),
  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
}));
