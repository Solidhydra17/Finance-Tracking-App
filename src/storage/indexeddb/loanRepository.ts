import type { Loan, LoanCreate, LoanPayment } from '@/types';
import { db } from './database';

export interface LoanRepository {
  getAll(): Promise<Loan[]>;
  getById(id: number): Promise<Loan | undefined>;
  create(loan: LoanCreate): Promise<number>;
  update(id: number, loan: Partial<Loan>): Promise<number>;
  delete(id: number): Promise<void>;
  getPayments(loanId: number): Promise<LoanPayment[]>;
  addPayment(loanId: number, amount: number, date: string): Promise<number>;
  getTotalPaid(loanId: number): Promise<number>;
}

export const loanRepository: LoanRepository = {
  async getAll(): Promise<Loan[]> {
    return db.loans.toArray();
  },

  async getById(id: number): Promise<Loan | undefined> {
    return db.loans.get(id);
  },

  async create(data: LoanCreate): Promise<number> {
    const now = new Date().toISOString();
    const loan: Loan = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    return db.loans.add(loan);
  },

  async update(id: number, data: Partial<Loan>): Promise<number> {
    const now = new Date().toISOString();
    await db.loans.update(id, { ...data, updatedAt: now });
    return id;
  },

  async delete(id: number): Promise<void> {
    await db.loanPayments.where('loanId').equals(id).delete();
    await db.loans.delete(id);
  },

  async getPayments(loanId: number): Promise<LoanPayment[]> {
    return db.loanPayments.where('loanId').equals(loanId).toArray();
  },

  async addPayment(loanId: number, amount: number, date: string): Promise<number> {
    const now = new Date().toISOString();
    const payment: LoanPayment = {
      loanId,
      amount,
      date,
      createdAt: now,
    };
    return db.loanPayments.add(payment);
  },

  async getTotalPaid(loanId: number): Promise<number> {
    const payments = await db.loanPayments.where('loanId').equals(loanId).toArray();
    return payments.reduce((sum, p) => sum + p.amount, 0);
  },
};
