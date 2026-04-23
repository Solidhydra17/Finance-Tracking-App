import type { Transaction, TransactionCreate, TransactionUpdate, FilterState } from '@/types';
import { transactionRepository } from '@/storage/indexeddb';
import { addCents, subtractCents } from '@/lib/money';

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
    return transactionRepository.create(data);
  },

  async update(id: number, data: TransactionUpdate): Promise<number> {
    return transactionRepository.update(id, data);
  },

  async softDelete(id: number): Promise<void> {
    return transactionRepository.softDelete(id);
  },

  async getByFilters(filters: FilterState): Promise<Transaction[]> {
    let transactions = await transactionRepository.getAll();

    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      const { startDate, endDate } = filters.dateRange;
      transactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    }

    if (filters.categoryId) {
      transactions = transactions.filter(t => t.categoryId === filters.categoryId);
    }

    if (filters.transactionType !== 'all') {
      transactions = transactions.filter(t => t.type === filters.transactionType);
    }

    if (filters.loanOnly) {
      transactions = transactions.filter(t => t.source === 'loan_payment');
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      transactions = transactions.filter(t =>
        t.note.toLowerCase().includes(query) ||
        t.date.includes(query)
      );
    }

    return transactions.sort((a, b) => b.date.localeCompare(a.date));
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
