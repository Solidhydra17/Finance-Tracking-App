import type { LoanRepository } from './loanRepository';
import type { Loan, LoanPayment } from '@/types';
import { loanRepository } from '@/storage/indexeddb/loanRepository';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';

export class LoanService {
    constructor(
        private loanRepo: LoanRepository
    ) {}

    async getAllLoans(): Promise<Loan[]> {
        return await this.loanRepo.getAll();
    }

    async getLoanDetails(id: number): Promise<{ loan: Loan; payments: LoanPayment[] } | undefined> {
        const loan = await this.loanRepo.getById(id);
        if (!loan) return undefined;
        const payments = await this.loanRepo.getPaymentsForLoan(id);
        return { loan, payments };
    }

    async createLoan(loanData: Omit<Loan, 'id' | 'createdAt'>): Promise<number> {
        const loanId = await this.loanRepo.create(loanData);
        return loanId;
    }

    async updateLoan(id: number, updates: Partial<Omit<Loan, 'id' | 'createdAt'>>): Promise<void> {
        const loan = await this.loanRepo.getById(id);
        if (!loan) throw new Error('Loan not found');

        // Guard: if amount is changing, ensure it is not below what has already been paid
        if (updates.amount !== undefined && updates.amount !== loan.amount) {
            const payments = await this.loanRepo.getPaymentsForLoan(id);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            if (updates.amount < totalPaid) {
                throw new Error(
                    `Cannot set loan amount below total already repaid (${totalPaid} cents). Minimum is ${totalPaid} cents.`
                );
            }
        }

        await this.loanRepo.update(id, updates);

        // Recalculate status from payment history
        const payments = await this.loanRepo.getPaymentsForLoan(id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const newAmount = updates.amount ?? loan.amount;
        const newStatus: Loan['status'] =
            totalPaid === 0 ? 'active' :
            totalPaid >= newAmount ? 'paid' : 'partially_paid';
        await this.loanRepo.update(id, { status: newStatus });
    }


    async repayLoan(loanId: number, amount: number, walletAccountId: number, date: string, notes?: string, time?: string): Promise<void> {
        const loan = await this.loanRepo.getById(loanId);
        if (!loan) throw new Error("Loan not found");

        // Guard: prevent overpayment
        const existingPayments = await this.loanRepo.getPaymentsForLoan(loanId);
        const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = loan.amount - alreadyPaid;
        if (amount <= 0) throw new Error("Repayment amount must be greater than zero");
        if (amount > remaining) throw new Error(`Repayment of ${amount} exceeds remaining balance of ${remaining}`);

        const transactionId = await transactionsEngine.create({
            type: loan.direction === 'outbound' ? 'income' : 'expense',
            amount,
            date,
            time: time || '00:00',
            categoryId: 0,
            note: notes || (loan.direction === 'outbound' ? `Repayment received from ${loan.personName}` : `Repayment made to ${loan.personName}`),
            source: 'loan_payment',
            walletAccountId
        });

        const payment: Omit<LoanPayment, 'id'> = {
            loanId,
            amount,
            walletAccountId,
            paidDate: date,
            time: time || '00:00',
            notes,
            transactionId
        } as any;

        await this.loanRepo.addPayment(payment);

        // Calculate if fully paid
        const payments = await this.loanRepo.getPaymentsForLoan(loanId);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const newStatus = totalPaid >= loan.amount ? 'paid' : 'partially_paid';
        if (loan.status !== newStatus) {
            await this.loanRepo.update(loanId, { status: newStatus });
        }
    }


    async getTotals(): Promise<{
        totalOwedToYou: number; // Outbound
        totalYouOwe: number;    // Inbound
    }> {
        const loans = await this.getAllLoans();
        
        let totalOwedToYou = 0;
        let totalYouOwe = 0;

        for (const loan of loans) {
            const payments = await this.loanRepo.getPaymentsForLoan(loan.id!);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const remaining = loan.amount - totalPaid;

            if (remaining > 0) {
                if (loan.direction === 'outbound') {
                    totalOwedToYou += remaining;
                } else {
                    totalYouOwe += remaining;
                }
            }
        }

        return { totalOwedToYou, totalYouOwe };
    }
}

export const loanService = new LoanService(loanRepository);
