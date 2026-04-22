import type { Transaction, TransactionCreate, TransactionUpdate } from '@/types';
import { db } from './database';

export interface TransactionRepository {
  getAll(): Promise<Transaction[]>;
  getById(id: number): Promise<Transaction | undefined>;
  create(transaction: TransactionCreate): Promise<number>;
  update(id: number, transaction: TransactionUpdate): Promise<number>;
  softDelete(id: number): Promise<void>;
  getByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;
  getByCategory(categoryId: number): Promise<Transaction[]>;
  getBySource(source: 'manual' | 'recurring' | 'loan_payment'): Promise<Transaction[]>;
}

export const transactionRepository: TransactionRepository = {
  async getAll(): Promise<Transaction[]> {
    return db.transactions.filter(t => !t.deletedAt).toArray();
  },

  async getById(id: number): Promise<Transaction | undefined> {
    const transaction = await db.transactions.get(id);
    return transaction?.deletedAt ? undefined : transaction;
  },

  async create(data: TransactionCreate): Promise<number> {
    const now = new Date().toISOString();
    const transaction: Transaction = {
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return db.transactions.add(transaction);
  },

  async update(id: number, data: TransactionUpdate): Promise<number> {
    const now = new Date().toISOString();
    await db.transactions.update(id, { ...data, updatedAt: now });
    return id;
  },

  async softDelete(id: number): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.update(id, { deletedAt: now, updatedAt: now });
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return db.transactions
      .filter(t => !t.deletedAt && t.date >= startDate && t.date <= endDate)
      .toArray();
  },

  async getByCategory(categoryId: number): Promise<Transaction[]> {
    return db.transactions
      .filter(t => !t.deletedAt && t.categoryId === categoryId)
      .toArray();
  },

  async getBySource(source: 'manual' | 'recurring' | 'loan_payment'): Promise<Transaction[]> {
    return db.transactions
      .filter(t => !t.deletedAt && t.source === source)
      .toArray();
  },
};
