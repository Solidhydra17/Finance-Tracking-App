import { db } from './database';
import type { Loan, LoanPayment } from '@/types';
import type { LoanRepository } from '@/domain/loans/loanRepository';

export class IndexedDBLoanRepository implements LoanRepository {
    async getAll(): Promise<Loan[]> {
        return await db.loans.toArray();
    }

    async getById(id: number): Promise<Loan | undefined> {
        return await db.loans.get(id);
    }

    async create(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<number> {
        const newLoan: Loan = {
            ...loan,
            createdAt: new Date().toISOString()
        };
        return await db.loans.add(newLoan);
    }

    async update(id: number, updates: Partial<Loan>): Promise<void> {
        await db.loans.update(id, updates);
    }

    async delete(id: number): Promise<void> {
        await db.loans.delete(id);
    }

    async addPayment(payment: Omit<LoanPayment, 'id'>): Promise<number> {
        return await db.loanPayments.add(payment as LoanPayment);
    }

    async getPaymentsForLoan(loanId: number): Promise<LoanPayment[]> {
        return await db.loanPayments.where('loanId').equals(loanId).toArray();
    }

    async deletePayment(paymentId: number): Promise<void> {
        await db.loanPayments.delete(paymentId);
    }

    async getPaymentByTransactionId(transactionId: number): Promise<LoanPayment | undefined> {
        // Prefer indexed lookup when available (schema v16+); fall back to scan.
        try {
            const indexed = await db.loanPayments.where('transactionId').equals(transactionId).first();
            if (indexed) return indexed;
        } catch {
            // Index may be missing on older DBs mid-migration
        }
        return db.loanPayments.filter((p) => p.transactionId === transactionId).first();
    }
}

export const loanRepository = new IndexedDBLoanRepository();
