import { create } from 'zustand';
import type { Transaction, FilterState } from '@/types';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  totalTransactions: number;
  currentPage: number;
  lastFilters: FilterState | null;
  
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setTotal: (total: number) => void;
  setPage: (page: number) => void;
  setLastFilters: (filters: FilterState) => void;
  invalidateCache: () => void;
  refreshToken: number;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: true,
  totalTransactions: 0,
  currentPage: 1,
  lastFilters: null,
  refreshToken: 0,

  setTransactions: (transactions) => set({ transactions }),
  setLoading: (isLoading) => set({ isLoading }),
  setTotal: (totalTransactions) => set({ totalTransactions }),
  setPage: (currentPage) => set({ currentPage }),
  setLastFilters: (lastFilters) => set({ lastFilters }),
  invalidateCache: () => set(state => ({ lastFilters: null, refreshToken: state.refreshToken + 1 })),
}));
