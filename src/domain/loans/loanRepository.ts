import type { Loan, LoanPayment } from '@/types';

export interface LoanRepository {
    getAll(): Promise<Loan[]>;
    getById(id: number): Promise<Loan | undefined>;
    create(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<number>;
    update(id: number, updates: Partial<Loan>): Promise<void>;
    delete(id: number): Promise<void>;
    
    addPayment(payment: Omit<LoanPayment, 'id'>): Promise<number>;
    getPaymentsForLoan(loanId: number): Promise<LoanPayment[]>;
}
