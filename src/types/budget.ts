export type PayFrequency = 'monthly' | 'semi-monthly';
export type BudgetItemType = 'expense' | 'savings' | 'installment';

export type BudgetItemFrequency = 'day' | 'week' | 'biweekly' | 'month';

export interface BudgetPlan {
  id?: number;
  grossSalaryCents: number;
  netSalaryCents: number;
  payFrequency: PayFrequency;
  firstPayDay?: number;
  secondPayDay?: number;
  workDaysPerWeek: number; // New field
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id?: number;
  name: string;
  categoryId?: number; // Optional for non-expenses
  amountCents: number;
  frequency: BudgetItemFrequency;
  useWorkSchedule: boolean;
  type: BudgetItemType;
  dueDay?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BudgetPlanUpdate = Partial<Omit<BudgetPlan, 'id' | 'createdAt' | 'updatedAt'>>;
export type BudgetItemCreate = Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>;
export type BudgetItemUpdate = Partial<Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>>;
