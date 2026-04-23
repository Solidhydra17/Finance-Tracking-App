import type { Category, CategoryCreate } from '@/types';
import { db } from './database';

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: number): Promise<Category | undefined>;
  getByType(type: 'income' | 'expense' | 'both'): Promise<Category[]>;
  create(category: CategoryCreate): Promise<number>;
  update(id: number, category: Partial<Category>): Promise<number>;
  delete(id: number): Promise<void>;
}

export const categoryRepository: CategoryRepository = {
  async getAll(): Promise<Category[]> {
    return db.categories.toArray();
  },

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async getByType(type: 'income' | 'expense' | 'both'): Promise<Category[]> {
    if (type === 'both') {
      return db.categories.toArray();
    }
    return db.categories.filter(c => c.type === type || c.type === 'both').toArray();
  },

  async create(data: CategoryCreate): Promise<number> {
    const category: Category = { ...data };
    return db.categories.add(category);
  },

  async update(id: number, data: Partial<Category>): Promise<number> {
    await db.categories.update(id, data);
    return id;
  },

  async delete(id: number): Promise<void> {
    await db.categories.delete(id);
  },
};

// Default categories
export const defaultCategories: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#22c55e', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Freelance', type: 'income', color: '#10b981', icon: 'BriefcaseIcon', isCustom: false },
  { name: 'Investment', type: 'income', color: '#14b8a6', icon: 'ChartBarIcon', isCustom: false },
  { name: 'Other Income', type: 'income', color: '#06b6d4', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Food & Dining', type: 'expense', color: '#f97316', icon: 'CakeIcon', isCustom: false },
  { name: 'Transportation', type: 'expense', color: '#eab308', icon: 'TruckIcon', isCustom: false },
  { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'ShoppingBagIcon', isCustom: false },
  { name: 'Entertainment', type: 'expense', color: '#8b5cf6', icon: 'TicketIcon', isCustom: false },
  { name: 'Bills & Utilities', type: 'expense', color: '#6366f1', icon: 'DocumentTextIcon', isCustom: false },
  { name: 'Healthcare', type: 'expense', color: '#ef4444', icon: 'HeartIcon', isCustom: false },
  { name: 'Education', type: 'expense', color: '#3b82f6', icon: 'AcademicCapIcon', isCustom: false },
  { name: 'Other Expense', type: 'expense', color: '#78716c', icon: 'ArchiveBoxIcon', isCustom: false },
];

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(defaultCategories);
  }
}
