import { create } from 'zustand';
import { walletService } from '@/domain/wallet/walletService';
import type { WalletAccount, CreditPayment } from '@/types';

interface WalletState {
    accounts: WalletAccount[];
    totalWalletBalance: number;
    totalCreditDebt: number;
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
        try {
            await walletService.deleteAccount(id);
            // Optimistically remove from store — no loading spinner
            set((state) => ({
                accounts: state.accounts.filter(a => a.id !== id),
            }));
            // Background refresh totals
            const totals = await walletService.getTotals();
            set({ 
                totalWalletBalance: totals.totalWalletBalance,
                totalCreditDebt: totals.totalCreditDebt,
            });
        } catch (error: any) {
            set({ error: error.message });
            throw error;
        }
    },

    payCreditCard: async (paymentData) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.payCreditCard(paymentData);
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

    createFundTransfer: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await walletService.createFundTransfer(data);
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
