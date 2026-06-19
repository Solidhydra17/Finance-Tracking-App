export type PayFrequency = 'monthly' | 'semi-monthly';
export type BudgetItemType = 'expense' | 'savings' | 'installment';

export interface BudgetPlan {
  id?: number;
  grossSalaryCents: number;
  netSalaryCents: number;
  payFrequency: PayFrequency;
  firstPayDay?: number;
  secondPayDay?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id?: number;
  name: string;
  amountCents: number;
  type: BudgetItemType;
  dueDay?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BudgetPlanUpdate = Partial<Omit<BudgetPlan, 'id' | 'createdAt' | 'updatedAt'>>;
export type BudgetItemCreate = Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>;
export type BudgetItemUpdate = Partial<Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>>;
