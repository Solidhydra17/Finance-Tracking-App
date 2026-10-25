export interface PaymentPlan {
  id?: number;
  name: string;
  amount: number;
  dueDate: string;
  months: number;
  remindDaysBefore: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPlanCreate {
  name: string;
  amount: number;
  dueDate: string;
  months: number;
  remindDaysBefore: number;
  enabled: boolean;
}
