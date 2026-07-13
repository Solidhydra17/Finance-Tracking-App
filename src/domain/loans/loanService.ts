import type { LoanRepository } from './loanRepository';
import type { WalletRepository } from '@/domain/wallet/walletRepository';
import type { Loan, LoanPayment } from '@/types';
import { loanRepository } from '@/storage/indexeddb/loanRepository';
import { walletRepository } from '@/storage/indexeddb/walletRepository';

export class LoanService {
    constructor(
        private loanRepo: LoanRepository,
        private walletRepo: WalletRepository
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
        
        // Immediately impact the associated wallet account
        if (loanData.direction === 'outbound' && loanData.sourceWalletAccountId) {
            // Money leaves your account
            await this.walletRepo.adjustBalance(loanData.sourceWalletAccountId, -loanData.amount);
        } else if (loanData.direction === 'inbound' && loanData.destinationWalletAccountId) {
            // Money enters your account
            await this.walletRepo.adjustBalance(loanData.destinationWalletAccountId, loanData.amount);
        }

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

        // Impact the associated wallet account
        if (loan.direction === 'outbound') {
            // Money comes back to your account
            await this.walletRepo.adjustBalance(walletAccountId, amount);
        } else if (loan.direction === 'inbound') {
            // Money leaves your account to pay back the lender
            await this.walletRepo.adjustBalance(walletAccountId, -amount);
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

export const loanService = new LoanService(loanRepository, walletRepository);
