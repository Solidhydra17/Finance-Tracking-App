export type WalletAccountType = 'cash' | 'debit' | 'credit';

export interface WalletAccount {
    id?: number;
    name: string;
    type: WalletAccountType;
    balance: number; // in integer cents
    creditLimit?: number; // in integer cents, only applicable for credit cards
    createdAt: string; // ISO string
}
