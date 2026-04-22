export type LoanDirection = 'lent' | 'borrowed';

export interface Loan {
  id?: number;
  direction: LoanDirection;
  counterpartyName: string;
  principal: number; // integer cents
  interestRate: number; // percentage (e.g., 5 for 5%)
  termMonths: number;
  startDate: string; // ISO date string
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanCreate {
  direction: LoanDirection;
  counterpartyName: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  notes: string;
}

export interface LoanPayment {
  id?: number;
  loanId: number;
  amount: number; // integer cents
  date: string; // ISO date string
  createdAt: string;
}

export interface LoanInstallment {
  dueDate: string;
  amount: number; // integer cents
  principal: number;
  interest: number;
  balance: number;
  isPaid: boolean;
}
