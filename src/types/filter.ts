import type { WalletAccountType } from './wallet';

export type DateRangePreset = 'week' | 'month' | 'year' | 'custom';
export type TransactionTypeFilter = 'all' | 'income' | 'expense' | 'credit_payment' | 'loans' | 'fund_transfer';
export type TransactionKindFilter = Exclude<TransactionTypeFilter, 'all'>;

export interface DateRange {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

export interface FilterState {
  dateRange: DateRange;
  categoryId: number | null;
  transactionType: TransactionTypeFilter;
  /** Empty means every transaction kind. */
  transactionTypes?: TransactionKindFilter[];
  /** Empty means every wallet type. */
  walletTypes?: WalletAccountType[];
  loanOnly: boolean;
  searchQuery: string;
}
