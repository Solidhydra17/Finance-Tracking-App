export type LoanDirection = 'outbound' | 'inbound';
export type LoanStatus = 'active' | 'partially_paid' | 'paid';

export interface LoanInstallment {
    amount: number; // integer cents
    dueDate: string; // ISO string
    isPaid: boolean;
}

export interface LoanInstallmentPlan {
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    installments: LoanInstallment[];
}

export interface Loan {
    id?: number;
    direction: LoanDirection;
    personName: string;
    amount: number; // integer cents
    acquiredDate: string; // ISO string
    dueDate: string; // ISO string
    notes?: string;
    sourceWalletAccountId?: number; // The account money came from (for outbound)
    destinationWalletAccountId?: number; // The account money went to (for inbound)
    installmentPlan?: LoanInstallmentPlan;
    status: LoanStatus;
    createdAt: string; // ISO string
}

export interface LoanPayment {
    id?: number;
    loanId: number;
    amount: number; // integer cents
    walletAccountId: number; // The account used for repayment
    paidDate: string; // ISO string
    notes?: string;
}
