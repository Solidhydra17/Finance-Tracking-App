import type { WalletRepository } from './walletRepository';
import type { WalletAccount } from '@/types';
import { walletRepository } from '@/storage/indexeddb/walletRepository';
import { db } from '@/storage/indexeddb/database';
import type { CreditPayment } from '@/types';

export class WalletService {
    constructor(private repository: WalletRepository) {}

    async getAllAccounts(): Promise<WalletAccount[]> {
        const accounts = await this.repository.getAll();
        for (const acc of accounts) {
            await this.computeBalance(acc);
        }
        return accounts;
    }

    async getCashAccount(): Promise<WalletAccount | undefined> {
        const accounts = await this.getAllAccounts();
        return accounts.find(a => a.type === 'cash');
    }

    private async computeBalance(acc: WalletAccount): Promise<void> {
        if (!acc.id) return;

        if (acc.type === 'cash' || acc.type === 'debit' || acc.type === 'ecash') {
            let balance = 0;
            
            // Transactions
            const txs = await db.transactions.where('walletAccountId').equals(acc.id).toArray();
            for (const tx of txs) {
                if (!tx.deletedAt && tx.type !== 'fund_transfer' && tx.type !== 'credit_payment') {
                    balance += (tx.type === 'income' ? tx.amount : -tx.amount);
                }
            }
            
            // Loans
            const loans = await db.loans.toArray();
            for (const loan of loans) {
                if (loan.direction === 'outbound' && loan.sourceWalletAccountId === acc.id) balance -= loan.amount;
                if (loan.direction === 'inbound' && loan.destinationWalletAccountId === acc.id) balance += loan.amount;
            }
            
            // Loan Payments
            const loanPayments = await db.loanPayments.where('walletAccountId').equals(acc.id).toArray();
            for (const p of loanPayments) {
                const loan = loans.find(l => l.id === p.loanId);
                if (loan) {
                    if (loan.direction === 'outbound') balance += p.amount;
                    if (loan.direction === 'inbound') balance -= p.amount;
                }
            }
            
            // Credit Payments sourced from this account
            const creditPayments = await db.transactions
                .where('walletAccountId').equals(acc.id)
                .filter(tx => tx.type === 'credit_payment' && !tx.deletedAt)
                .toArray();
            for (const cp of creditPayments) {
                balance -= cp.amount;
            }
            
            acc.balance = balance;

            // Fund Transfers where this account is source (outgoing)
            const outTransfers = await db.transactions
                .where('walletAccountId').equals(acc.id)
                .filter(tx => tx.type === 'fund_transfer' && !tx.deletedAt)
                .toArray();
            for (const ft of outTransfers) {
                acc.balance -= ft.amount;
            }

            // Fund Transfers where this account is destination (incoming)
            const inTransfers = await db.transactions
                .where('targetWalletAccountId').equals(acc.id)
                .filter(tx => tx.type === 'fund_transfer' && !tx.deletedAt)
                .toArray();
            for (const ft of inTransfers) {
                acc.balance += ft.amount;
            }
        } else if (acc.type === 'credit') {
            let owed = 0;
            
            // Expenses on this card
            const txs = await db.transactions.where('walletAccountId').equals(acc.id).toArray();
            for (const tx of txs) {
                if (!tx.deletedAt && tx.type === 'expense') {
                    owed += tx.amount;
                }
            }
            
            // Minus Credit Payments to this card
            const creditPayments = await db.transactions
                .where('targetWalletAccountId').equals(acc.id)
                .filter(tx => tx.type === 'credit_payment' && !tx.deletedAt)
                .toArray();
            for (const cp of creditPayments) {
                owed -= cp.amount;
            }
            
            acc.balance = Math.max(0, owed);
        }
    }

    async createAccount(account: Omit<WalletAccount, 'id' | 'createdAt' | 'balance'>): Promise<number> {
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
            if (acc.type === 'cash' || acc.type === 'debit' || acc.type === 'ecash') {
                totalWalletBalance += acc.balance;
            } else if (acc.type === 'credit') {
                // If a credit card has a positive balance, it means you owe money
                totalCreditDebt += Math.max(0, acc.balance);
            }
        });

        return { totalWalletBalance, totalCreditDebt };
    }

    async payCreditCard(paymentData: Omit<CreditPayment, 'id' | 'createdAt'>): Promise<number> {
        return await db.transactions.add({
            type: 'credit_payment',
            walletAccountId: paymentData.sourceWalletAccountId,
            targetWalletAccountId: paymentData.creditCardAccountId,
            amount: paymentData.amount,
            date: paymentData.date,
            note: paymentData.notes || '',
            source: 'manual',
            categoryId: 0, // Placeholder
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        });
    }
    async createFundTransfer(data: {
        sourceAccountId: number;
        destinationAccountId: number;
        amount: number;
        date: string;
        notes?: string;
    }): Promise<number> {
        return await db.transactions.add({
            type: 'fund_transfer',
            walletAccountId: data.sourceAccountId,
            targetWalletAccountId: data.destinationAccountId,
            amount: data.amount,
            date: data.date,
            note: data.notes || '',
            source: 'manual',
            categoryId: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        });
    }
}

export const walletService = new WalletService(walletRepository);
