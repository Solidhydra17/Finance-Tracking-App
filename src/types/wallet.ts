export type WalletAccountType = 'cash' | 'debit' | 'ecash' | 'credit' | 'loan' | 'deposit';

export interface WalletAccount {
    id?: number;
    name: string;
    type: WalletAccountType;
    balance: number; // in integer cents
    creditLimit?: number; // in integer cents, only applicable for credit cards
    /** Developer adjustment so a credit or loan can start from a chosen used amount. */
    balanceAdjustment?: number;
    createdAt: string; // ISO string
}

export interface CreditPayment {
    id?: number;
    creditCardAccountId: number;
    sourceWalletAccountId: number;
    amount: number; // in integer cents
    date: string; // ISO string
    notes?: string;
    createdAt: string; // ISO string
}
