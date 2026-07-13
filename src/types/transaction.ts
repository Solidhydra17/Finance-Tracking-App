export type TransactionType = 'income' | 'expense' | 'loan';
export type TransactionSource = 'manual' | 'recurring' | 'loan_payment';

export interface Transaction {
  id?: number | string;
  type: TransactionType;
  amount: number; // integer cents
  date: string; // ISO date string
  categoryId: number;
  note: string;
  source: TransactionSource;
  recurringRuleId?: number;
  walletAccountId?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TransactionCreate {
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: number;
  note: string;
  source: TransactionSource;
  walletAccountId?: number;
}

export interface TransactionUpdate {
  type?: TransactionType;
  amount?: number;
  date?: string;
  categoryId?: number;
  walletAccountId?: number;
  note?: string;
}
