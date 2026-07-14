export type DateRangePreset = 'week' | 'month' | 'year' | 'custom';
export type TransactionTypeFilter = 'all' | 'income' | 'expense' | 'credit_payment' | 'loans';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

export interface FilterState {
  dateRange: DateRange;
  categoryId: number | null;
  transactionType: TransactionTypeFilter;
  loanOnly: boolean;
  searchQuery: string;
}
