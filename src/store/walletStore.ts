import { create } from 'zustand';
import { walletService } from '@/domain/wallet/walletService';
import type { WalletAccount } from '@/types';

interface WalletState {
    accounts: WalletAccount[];
    totalWalletBalance: number;
    totalCreditDebt: number;
    isLoading: boolean;
    error: string | null;

    fetchAccounts: () => Promise<void>;
    createAccount: (account: Omit<WalletAccount, 'id' | 'createdAt'>) => Promise<void>;
    updateAccount: (id: number, updates: Partial<WalletAccount>) => Promise<void>;
    deleteAccount: (id: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
    accounts: [],
    totalWalletBalance: 0,
    totalCreditDebt: 0,
    isLoading: false,
    error: null,

    fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
            const accounts = await walletService.getAllAccounts();
            const totals = await walletService.getTotals();
            set({ 
                accounts, 
                totalWalletBalance: totals.totalWalletBalance, 
                totalCreditDebt: totals.totalCreditDebt,
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
            // Refresh
            const accounts = await walletService.getAllAccounts();
            const totals = await walletService.getTotals();
            set({ 
                accounts,
                totalWalletBalance: totals.totalWalletBalance,
                totalCreditDebt: totals.totalCreditDebt,
                isLoading: false 
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateAccount: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.updateAccount(id, updates);
            const accounts = await walletService.getAllAccounts();
            const totals = await walletService.getTotals();
            set({ 
                accounts,
                totalWalletBalance: totals.totalWalletBalance,
                totalCreditDebt: totals.totalCreditDebt,
                isLoading: false 
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteAccount: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.deleteAccount(id);
            const accounts = await walletService.getAllAccounts();
            const totals = await walletService.getTotals();
            set({ 
                accounts,
                totalWalletBalance: totals.totalWalletBalance,
                totalCreditDebt: totals.totalCreditDebt,
                isLoading: false 
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    }
}));
