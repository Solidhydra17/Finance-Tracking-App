import type { WalletRepository } from './walletRepository';
import type { WalletAccount } from '@/types';
import { walletRepository } from '@/storage/indexeddb/walletRepository';

export class WalletService {
    constructor(private repository: WalletRepository) {}

    async getAllAccounts(): Promise<WalletAccount[]> {
        return await this.repository.getAll();
    }

    async getCashAccount(): Promise<WalletAccount | undefined> {
        const accounts = await this.repository.getAll();
        return accounts.find(a => a.type === 'cash');
    }

    async createAccount(account: Omit<WalletAccount, 'id' | 'createdAt'>): Promise<number> {
        // Enforce singleton cash account
        if (account.type === 'cash') {
            const existingCash = await this.getCashAccount();
            if (existingCash) {
                throw new Error("A Cash account already exists.");
            }
        }
        return await this.repository.create(account);
    }

    async updateAccount(id: number, updates: Partial<WalletAccount>): Promise<void> {
        if (updates.type === 'cash') {
            throw new Error("Cannot change account type to cash.");
        }
        await this.repository.update(id, updates);
    }

    async deleteAccount(id: number): Promise<void> {
        const account = await this.repository.getById(id);
        if (account?.type === 'cash') {
            throw new Error("Cannot delete the Cash account.");
        }
        await this.repository.delete(id);
    }

    async getTotals(): Promise<{
        totalWalletBalance: number; // Cash + Debit
        totalCreditDebt: number;    // Sum of credit balances (usually positive if debt)
    }> {
        const accounts = await this.getAllAccounts();
        
        let totalWalletBalance = 0;
        let totalCreditDebt = 0;

        accounts.forEach(acc => {
            if (acc.type === 'cash' || acc.type === 'debit') {
                totalWalletBalance += acc.balance;
            } else if (acc.type === 'credit') {
                // If a credit card has a positive balance, it means you owe money
                totalCreditDebt += Math.max(0, acc.balance);
            }
        });

        return { totalWalletBalance, totalCreditDebt };
    }
}

export const walletService = new WalletService(walletRepository);
