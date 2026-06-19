import type { BudgetPlan, BudgetItem, BudgetPlanUpdate, BudgetItemCreate, BudgetItemUpdate } from '@/types';
import { db } from './database';

export interface BudgetRepository {
  getPlan(): Promise<BudgetPlan | undefined>;
  savePlan(plan: BudgetPlanUpdate | BudgetPlan): Promise<number>;
  
  getItems(): Promise<BudgetItem[]>;
  createItem(item: BudgetItemCreate): Promise<number>;
  updateItem(id: number, item: BudgetItemUpdate): Promise<number>;
  deleteItem(id: number): Promise<void>;
}

export const budgetRepository: BudgetRepository = {
  async getPlan(): Promise<BudgetPlan | undefined> {
    const plans = await db.budgetPlans.toArray();
    return plans[0]; // We only ever expect one plan for the MVP
  },

  async savePlan(data: BudgetPlanUpdate | BudgetPlan): Promise<number> {
    const now = new Date().toISOString();
    const plans = await db.budgetPlans.toArray();
    
    if (plans.length > 0) {
      const existingId = plans[0].id!;
      await db.budgetPlans.update(existingId, { ...data, updatedAt: now });
      return existingId;
    } else {
      const newPlan: BudgetPlan = {
        grossSalaryCents: 0,
        netSalaryCents: 0,
        payFrequency: 'monthly',
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      return db.budgetPlans.add(newPlan);
    }
  },

  async getItems(): Promise<BudgetItem[]> {
    return db.budgetItems.toArray();
  },

  async createItem(data: BudgetItemCreate): Promise<number> {
    const now = new Date().toISOString();
    const item: BudgetItem = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    return db.budgetItems.add(item);
  },

  async updateItem(id: number, data: BudgetItemUpdate): Promise<number> {
    const now = new Date().toISOString();
    await db.budgetItems.update(id, { ...data, updatedAt: now });
    return id;
  },

  async deleteItem(id: number): Promise<void> {
    await db.budgetItems.delete(id);
  }
};
