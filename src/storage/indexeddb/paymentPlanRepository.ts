import type { PaymentPlan, PaymentPlanCreate } from '@/types';
import { db } from './database';

export const paymentPlanRepository = {
  async getAll(): Promise<PaymentPlan[]> {
    return db.paymentPlans.orderBy('dueDate').toArray();
  },

  async create(data: PaymentPlanCreate): Promise<number> {
    const now = new Date().toISOString();
    return db.paymentPlans.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(id: number, data: Partial<PaymentPlan>): Promise<void> {
    await db.paymentPlans.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  async delete(id: number): Promise<void> {
    await db.paymentPlans.delete(id);
  },
};
