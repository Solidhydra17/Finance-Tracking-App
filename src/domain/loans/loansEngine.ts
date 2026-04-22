import type { Loan, LoanCreate, LoanPayment, LoanInstallment } from '@/types';
import { loanRepository } from '@/storage/indexeddb';
import { addCents, subtractCents, divideCents, multiplyCents } from '@/lib/money';

export const loansEngine = {
  async getAll(): Promise<Loan[]> {
    return loanRepository.getAll();
  },

  async getById(id: number): Promise<Loan | undefined> {
    return loanRepository.getById(id);
  },

  async create(data: LoanCreate): Promise<number> {
    return loanRepository.create(data);
  },

  async update(id: number, data: Partial<Loan>): Promise<number> {
    return loanRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    return loanRepository.delete(id);
  },

  async getPayments(loanId: number): Promise<LoanPayment[]> {
    return loanRepository.getPayments(loanId);
  },

  async addPayment(loanId: number, amount: number, date: string): Promise<number> {
    return loanRepository.addPayment(loanId, amount, date);
  },

  async getTotalPaid(loanId: number): Promise<number> {
    return loanRepository.getTotalPaid(loanId);
  },

  generateInstallmentSchedule(loan: Loan): LoanInstallment[] {
    const installments: LoanInstallment[] = [];
    const monthlyInterestRate = loan.interestRate / 100;
    const totalPayment = addCents(loan.principal, multiplyCents(loan.principal, monthlyInterestRate * loan.termMonths));
    const installmentAmount = divideCents(totalPayment, loan.termMonths);

    let balance = loan.principal;
    const startDate = new Date(loan.startDate);

    for (let month = 0; month < loan.termMonths; month++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);

      const interest = multiplyCents(balance, monthlyInterestRate);
      const principal = subtractCents(installmentAmount, interest);
      balance = subtractCents(balance, principal);

      installments.push({
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        principal: principal,
        interest: interest,
        balance: Math.max(0, balance),
        isPaid: false,
      });
    }

    return installments;
  },

  calculateRemainingBalance(loan: Loan, totalPaid: number): number {
    const monthlyInterestRate = loan.interestRate / 100;
    const totalPayment = addCents(loan.principal, multiplyCents(loan.principal, monthlyInterestRate * loan.termMonths));
    const remaining = subtractCents(totalPayment, totalPaid);
    return Math.max(0, remaining);
  },

  calculateTotalExposure(loans: Loan[]): { lent: number; borrowed: number; net: number } {
    let lent = 0;
    let borrowed = 0;

    for (const loan of loans) {
      if (loan.direction === 'lent') {
        lent = addCents(lent, loan.principal);
      } else {
        borrowed = addCents(borrowed, loan.principal);
      }
    }

    return {
      lent,
      borrowed,
      net: subtractCents(lent, borrowed),
    };
  },
};
