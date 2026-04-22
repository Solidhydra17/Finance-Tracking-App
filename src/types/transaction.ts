export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'recurring' | 'loan_payment';

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number; // integer cents
  date: string; // ISO date string
  categoryId: number;
  note: string;
  source: TransactionSource;
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
}

export interface TransactionUpdate {
  type?: TransactionType;
  amount?: number;
  date?: string;
  categoryId?: number;
  note?: string;
}
