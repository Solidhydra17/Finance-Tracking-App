export type RecurringFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'custom-days';

export interface RecurringRule {
  id?: number;
  type: 'income' | 'expense';
  amount: number; // integer cents
  categoryId: number;
  frequency: RecurringFrequency;
  dayOfWeek: number | null; // 0-6 for weekly
  dayOfMonth: number | null; // 1-31 for monthly
  selectedDays?: number[];
  startDate: string; // ISO date string
  endDate: string | null; // ISO date string, null if indefinite
  lastGeneratedDate: string | null; // Track materialization
  description: string;
  time?: string;
  walletAccountId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRuleCreate {
  type: 'income' | 'expense';
  amount: number;
  categoryId: number;
  frequency: RecurringFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  selectedDays?: number[];
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  description: string;
  time?: string;
  walletAccountId?: number;
}

export interface RecurringTransaction {
  id: string; // Virtual ID like "recurring-{ruleId}-{date}"
  date: string;
  amount: number;
  categoryId: number;
  type: 'income' | 'expense';
  description: string;
  source: 'recurring';
  recurringRuleId: number;
}
