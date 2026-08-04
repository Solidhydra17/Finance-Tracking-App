import { create } from 'zustand';
import { walletService } from '@/domain/wallet/walletService';
import type { WalletAccount, CreditPayment } from '@/types';
import { refreshFinancialState } from '@/lib/financialState';

interface WalletState {
    accounts: WalletAccount[];
    totalWalletBalance: number;
    totalCreditDebt: number;
    walletLoanDebt: number;
    isLoading: boolean;
    error: string | null;

    fetchAccounts: () => Promise<void>;
    createAccount: (account: Omit<WalletAccount, 'id' | 'createdAt' | 'balance'>) => Promise<void>;
    updateAccount: (id: number, updates: Partial<WalletAccount>) => Promise<void>;
    deleteAccount: (id: number) => Promise<void>;
    payCreditCard: (paymentData: Omit<CreditPayment, 'id' | 'createdAt'>) => Promise<void>;
    createFundTransfer: (data: { sourceAccountId: number; destinationAccountId: number; amount: number; date: string; notes?: string }) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
    accounts: [],
    totalWalletBalance: 0,
    totalCreditDebt: 0,
    walletLoanDebt: 0,
    isLoading: false,
    error: null,

    /**
     * Pure read/refresh — fetches accounts and totals from DB, updates Zustand state.
     * No side effects. Widget sync is NOT triggered here.
     */
    fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
            const accounts = await walletService.getAllAccounts();
            const totals = await walletService.getTotals();
            set({
                accounts,
                totalWalletBalance: totals.totalWalletBalance,
                totalCreditDebt: totals.totalCreditDebt,
                walletLoanDebt: totals.walletLoanDebt,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    createAccount: async (account) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.createAccount(account);
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateAccount: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.updateAccount(id, updates);
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteAccount: async (id) => {
        try {
            await walletService.deleteAccount(id);
            await refreshFinancialState();
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },

    payCreditCard: async (paymentData) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.payCreditCard(paymentData);
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    createFundTransfer: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.createFundTransfer(data);
            await refreshFinancialState();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    }
}));