import type { LoanRepository } from './loanRepository';
import type { Loan, LoanPayment } from '@/types';
import { loanRepository } from '@/storage/indexeddb/loanRepository';

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

    async repayLoan(loanId: number, amount: number, walletAccountId: number, date: string, notes?: string): Promise<void> {
        const loan = await this.loanRepo.getById(loanId);
        if (!loan) throw new Error("Loan not found");

        const payment: Omit<LoanPayment, 'id'> = {
            loanId,
            amount,
            walletAccountId,
            paidDate: date,
            notes
        };

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
