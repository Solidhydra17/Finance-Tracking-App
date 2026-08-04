import { create } from 'zustand';
import { loanService } from '@/domain/loans/loanService';
import type { Loan } from '@/types';
import { refreshFinancialState } from '@/lib/financialState';

interface LoanState {
    loans: Loan[];
    totalOwedToYou: number;
    totalYouOwe: number;
    isLoading: boolean;
    error: string | null;

    fetchLoans: () => Promise<void>;
    createLoan: (loanData: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
    repayLoan: (loanId: number, amount: number, walletAccountId: number, date: string, notes?: string) => Promise<void>;
}

export const useLoanStore = create<LoanState>((set) => ({
    loans: [],
    totalOwedToYou: 0,
    totalYouOwe: 0,
    isLoading: false,
    error: null,

    /**
     * Pure read/refresh — fetches loans and totals from DB, updates Zustand state.
     * No side effects. Widget sync is NOT triggered here.
     */
    fetchLoans: async () => {
        set({ isLoading: true, error: null });
        try {
            const loans = await loanService.getAllLoans();
            const totals = await loanService.getTotals();
            set({
                loans,
                totalOwedToYou: totals.totalOwedToYou,
                totalYouOwe: totals.totalYouOwe,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    createLoan: async (loanData) => {
        set({ isLoading: true, error: null });
        try {
            await loanService.createLoan(loanData);
            // refreshFinancialState refreshes both wallets and loans (loan creation
            // affects both wallet balances and loan totals)
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    repayLoan: async (loanId, amount, walletAccountId, date, notes) => {
        set({ isLoading: true, error: null });
        try {
            await loanService.repayLoan(loanId, amount, walletAccountId, date, notes);
            // refreshFinancialState refreshes both wallets and loans (repayment
            // affects wallet balances and loan remaining totals)
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    }
}));
