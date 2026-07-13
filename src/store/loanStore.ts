import { create } from 'zustand';
import { loanService } from '@/domain/loans/loanService';
import type { Loan } from '@/types';
import { useWalletStore } from './walletStore';

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
            // Re-fetch loans
            const loans = await loanService.getAllLoans();
            const totals = await loanService.getTotals();
            set({ 
                loans, 
                totalOwedToYou: totals.totalOwedToYou,
                totalYouOwe: totals.totalYouOwe,
                isLoading: false 
            });
            // A loan creation impacts wallet balances, so trigger wallet refresh
            useWalletStore.getState().fetchAccounts();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    repayLoan: async (loanId, amount, walletAccountId, date, notes) => {
        set({ isLoading: true, error: null });
        try {
            await loanService.repayLoan(loanId, amount, walletAccountId, date, notes);
            const loans = await loanService.getAllLoans();
            const totals = await loanService.getTotals();
            set({ 
                loans, 
                totalOwedToYou: totals.totalOwedToYou,
                totalYouOwe: totals.totalYouOwe,
                isLoading: false 
            });
            // A loan repayment impacts wallet balances, so trigger wallet refresh
            useWalletStore.getState().fetchAccounts();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    }
}));
