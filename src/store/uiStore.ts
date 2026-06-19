import { create } from 'zustand';
import type { Toast, ToastType } from '@/lib/toast';
import type { FilterState, DateRange } from '@/types';
import type { DashboardData } from '@/domain/dashboard/types';
import { formatDateLocal } from '@/lib/date';

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setDateRange: (range: DateRange) => void;

  // Modals
  isAddTransactionOpen: boolean;
  setAddTransactionOpen: (open: boolean) => void;
  isAddLoanOpen: boolean;
  setAddLoanOpen: (open: boolean) => void;
  isAddRecurringOpen: boolean;
  setAddRecurringOpen: (open: boolean) => void;
  isAddMenuOpen: boolean;
  setAddMenuOpen: (open: boolean) => void;

  // Loan visibility
  showLoans: boolean;
  setShowLoans: (show: boolean) => void;

  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  isFirstLoad: boolean;
  setFirstLoad: (first: boolean) => void;

  // Preferences
  useMockData: boolean;
  setUseMockData: (use: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Dashboard cache
  cachedDashboardData: DashboardData | null;
  setCachedDashboardData: (data: DashboardData) => void;

  // Connectivity
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    preset: 'month',
    startDate: formatDateLocal(startOfMonth),
    endDate: formatDateLocal(now),
  };
};

const defaultFilters: FilterState = {
  dateRange: getDefaultDateRange(),
  categoryId: null,
  transactionType: 'all',
  loanOnly: false,
  searchQuery: '',
};

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  // Toasts
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = `toast-${++toastId}-${Date.now()}`;
    const toast: Toast = { id, type, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },
  resetFilters: () => {
    set({ filters: defaultFilters });
  },
  setDateRange: (range) => {
    set((state) => ({ filters: { ...state.filters, dateRange: range } }));
  },

  // Modals
  isAddTransactionOpen: false,
  setAddTransactionOpen: (open) => set({ isAddTransactionOpen: open }),
  isAddLoanOpen: false,
  setAddLoanOpen: (open) => set({ isAddLoanOpen: open }),
  isAddRecurringOpen: false,
  setAddRecurringOpen: (open) => set({ isAddRecurringOpen: open }),
  isAddMenuOpen: false,
  setAddMenuOpen: (open) => set({ isAddMenuOpen: open }),

  // Loan visibility
  showLoans: true,
  setShowLoans: (show) => set({ showLoans: show }),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  isFirstLoad: true,
  setFirstLoad: (first) => set({ isFirstLoad: first }),

  // Preferences
  useMockData: localStorage.getItem('useMockData') !== 'false',
  setUseMockData: (use) => {
    localStorage.setItem('useMockData', String(use));
    set({ useMockData: use });
  },
  darkMode: localStorage.getItem('darkMode') === 'true',
  setDarkMode: (dark) => {
    localStorage.setItem('darkMode', String(dark));
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: dark });
  },

  // Dashboard cache
  cachedDashboardData: null,
  setCachedDashboardData: (data) => set({ cachedDashboardData: data }),

  // Connectivity
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (online) => set({ isOnline: online }),
}));
