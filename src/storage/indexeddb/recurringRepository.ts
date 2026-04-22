import type { RecurringRule, RecurringRuleCreate } from '@/types';
import { db } from './database';

export interface RecurringRepository {
  getAll(): Promise<RecurringRule[]>;
  getById(id: number): Promise<RecurringRule | undefined>;
  create(rule: RecurringRuleCreate): Promise<number>;
  update(id: number, rule: Partial<RecurringRule>): Promise<number>;
  delete(id: number): Promise<void>;
}

export const recurringRepository: RecurringRepository = {
  async getAll(): Promise<RecurringRule[]> {
    return db.recurringRules.toArray();
  },

  async getById(id: number): Promise<RecurringRule | undefined> {
    return db.recurringRules.get(id);
  },

  async create(data: RecurringRuleCreate): Promise<number> {
    const now = new Date().toISOString();
    const rule: RecurringRule = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    return db.recurringRules.add(rule);
  },

  async update(id: number, data: Partial<RecurringRule>): Promise<number> {
    const now = new Date().toISOString();
    await db.recurringRules.update(id, { ...data, updatedAt: now });
    return id;
  },

  async delete(id: number): Promise<void> {
    await db.recurringRules.delete(id);
  },
};
