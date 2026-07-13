import type { Transaction, TransactionCreate, TransactionUpdate, FilterState } from '@/types';
import { transactionRepository } from '@/storage/indexeddb';
import { walletRepository } from '@/storage/indexeddb/walletRepository';
import { addCents, subtractCents } from '@/lib/money';
// import { recurringEngine } from '@/domain/recurring/recurringEngine';

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  total: number;
  percentage: number;
  color: string;
  icon: string;
}

export const transactionsEngine = {
  async getAll(): Promise<Transaction[]> {
    return transactionRepository.getAll();
  },

  async getById(id: number): Promise<Transaction | undefined> {
    return transactionRepository.getById(id);
  },

  async create(data: TransactionCreate): Promise<number> {
    const id = await transactionRepository.create(data);
    if (data.walletAccountId) {
        const amountDelta = data.type === 'income' ? data.amount : -data.amount;
        await walletRepository.adjustBalance(data.walletAccountId, amountDelta);
    }
    return id;
  },

  async update(id: number, data: TransactionUpdate): Promise<number> {
    const oldTransaction = await transactionRepository.getById(id);
    if (!oldTransaction) throw new Error("Transaction not found");

    const result = await transactionRepository.update(id, data);
    
    // Reverse old transaction impact if it had a wallet
    if (oldTransaction.walletAccountId) {
        const oldDelta = oldTransaction.type === 'income' ? oldTransaction.amount : -oldTransaction.amount;
        await walletRepository.adjustBalance(oldTransaction.walletAccountId, -oldDelta);
    }

    // Apply new transaction impact
    const newType = data.type ?? oldTransaction.type;
    const newAmount = data.amount ?? oldTransaction.amount;
    const newWalletId = data.walletAccountId !== undefined ? data.walletAccountId : oldTransaction.walletAccountId;
    
    if (newWalletId) {
        const newDelta = newType === 'income' ? newAmount : -newAmount;
        await walletRepository.adjustBalance(newWalletId, newDelta);
    }

    return result;
  },

  async softDelete(id: number): Promise<void> {
    const oldTransaction = await transactionRepository.getById(id);
    if (oldTransaction && !oldTransaction.deletedAt && oldTransaction.walletAccountId) {
        // Reverse impact
        const oldDelta = oldTransaction.type === 'income' ? oldTransaction.amount : -oldTransaction.amount;
        await walletRepository.adjustBalance(oldTransaction.walletAccountId, -oldDelta);
    }
    return transactionRepository.softDelete(id);
  },

  async getByFilters(filters: FilterState): Promise<Transaction[]> {
    return transactionRepository.getByFilters(filters);
  },

  calculateStats(transactions: Transaction[]): TransactionStats {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      if (t.type === 'income') {
        totalIncome = addCents(totalIncome, t.amount);
      } else {
        totalExpenses = addCents(totalExpenses, t.amount);
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netBalance: subtractCents(totalIncome, totalExpenses),
      transactionCount: transactions.length,
    };
  },

  getLargestExpense(transactions: Transaction[]): Transaction | null {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return null;
    return expenses.reduce((max, t) => t.amount > max.amount ? t : max);
  },

  getCategoryBreakdown(
    transactions: Transaction[],
    categories: { id?: number; name: string; color: string; icon: string }[]
  ): CategoryBreakdown[] {
    const expenses = transactions.filter(t => t.type === 'expense');
    let totalExpenses = 0;
    for (const t of expenses) {
      totalExpenses = addCents(totalExpenses, t.amount);
    }

    const breakdown: Map<number, number> = new Map();
    for (const t of expenses) {
      const current = breakdown.get(t.categoryId) || 0;
      breakdown.set(t.categoryId, addCents(current, t.amount));
    }

    const result: CategoryBreakdown[] = [];
    for (const [categoryId, total] of breakdown) {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        result.push({
          categoryId,
          categoryName: category.name,
          total,
          percentage: (total / totalExpenses) * 100,
          color: category.color,
          icon: category.icon,
        });
      }
    }

    return result.sort((a, b) => b.total - a.total);
  },
};
