import type { PaymentPlan, PaymentPlanCreate } from '@/types';
import { SYSTEM_CATEGORY } from './categoryRepository';
import { db } from './database';

export const paymentPlanRepository = {
  async getAll(): Promise<PaymentPlan[]> {
    return db.paymentPlans.orderBy('dueDate').toArray();
  },

  async create(data: PaymentPlanCreate): Promise<number> {
    const now = new Date().toISOString();
    const record: PaymentPlan = {
      name: data.name,
      amount: data.amount,
      dueDate: data.dueDate,
      months: data.months,
      repeatsMonthly: data.repeatsMonthly,
      remindDaysBefore: data.remindDaysBefore,
      enabled: data.enabled,
      createdAt: now,
      updatedAt: now,
    };
    if (data.categoryId) record.categoryId = data.categoryId;
    if (data.walletAccountId) record.walletAccountId = data.walletAccountId;
    return db.paymentPlans.add(record);
  },

  async update(id: number, data: PaymentPlanCreate): Promise<void> {
    await db.paymentPlans.where('id').equals(id).modify((plan) => {
      plan.name = data.name;
      plan.amount = data.amount;
      plan.dueDate = data.dueDate;
      plan.months = data.months;
      plan.repeatsMonthly = data.repeatsMonthly;
      plan.remindDaysBefore = data.remindDaysBefore;
      plan.enabled = data.enabled;
      plan.updatedAt = new Date().toISOString();
      if (data.categoryId) plan.categoryId = data.categoryId;
      else delete plan.categoryId;
      if (data.walletAccountId) plan.walletAccountId = data.walletAccountId;
      else delete plan.walletAccountId;
    });
  },

  async delete(id: number): Promise<void> {
    await db.paymentPlans.delete(id);
  },

  async expenseDates(categoryId?: number): Promise<string[]> {
    if (!categoryId) return [];
    const rows = await db.transactions.where('categoryId').equals(categoryId).toArray();
    return rows.filter((row) => row.type === 'expense' && !row.deletedAt).map((row) => row.date);
  },

  async paidDates(plan: Pick<PaymentPlan, 'categoryId' | 'walletAccountId'>): Promise<string[]> {
    const payments = async (accountId?: number) => {
      const rows = await db.transactions.where('type').equals('credit_payment').toArray();
      return rows
        .filter((row) => !row.deletedAt && (accountId == null || row.targetWalletAccountId === accountId))
        .map((row) => row.date);
    };

    if (plan.walletAccountId) return payments(plan.walletAccountId);

    const categoryDates = await this.expenseDates(plan.categoryId);
    if (!plan.categoryId) return categoryDates;

    const category = await db.categories.get(plan.categoryId);
    if (!category) return categoryDates;

    const name = category.name.trim().toLowerCase();
    if (name === SYSTEM_CATEGORY.CREDIT_PAYMENT.toLowerCase()) {
      return [...categoryDates, ...await payments()];
    }
    if (category.type !== 'income') return categoryDates;

    const income = await db.transactions.where('categoryId').equals(plan.categoryId).toArray();
    return income.filter((row) => row.type === 'income' && !row.deletedAt).map((row) => row.date);
  },
};
