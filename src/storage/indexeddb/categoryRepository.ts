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
  // ── INCOME ──
  { name: 'Salary',      type: 'income',  color: '#059669', icon: 'BriefcaseIcon',       isCustom: false },
  { name: 'Investment',  type: 'income',  color: '#3b82f6', icon: 'ArrowTrendingUpIcon',  isCustom: false },
  { name: 'Allowance',   type: 'income',  color: '#10b981', icon: 'AcademicCapIcon',      isCustom: false },
  { name: 'Gift',        type: 'income',  color: '#f59e0b', icon: 'GiftIcon',             isCustom: false },
  { name: 'Transfer',    type: 'income',  color: '#6366f1', icon: 'ArrowsRightLeftIcon',  isCustom: false },

  // ── EXPENSE ──
  { name: 'Housing',           type: 'expense', color: '#ef4444', icon: 'HomeIcon',                    isCustom: false },
  { name: 'Utilities',         type: 'expense', color: '#f97316', icon: 'BoltIcon',                    isCustom: false },
  { name: 'Food & Drinks',     type: 'expense', color: '#fb923c', icon: 'CakeIcon',                    isCustom: false },
  { name: 'Transportation',    type: 'expense', color: '#eab308', icon: 'TruckIcon',                   isCustom: false },
  { name: 'Shopping',          type: 'expense', color: '#ec4899', icon: 'ShoppingBagIcon',             isCustom: false },
  { name: 'Health',            type: 'expense', color: '#22c55e', icon: 'HeartIcon',                   isCustom: false },
  { name: 'Entertainment',     type: 'expense', color: '#a855f7', icon: 'FilmIcon',                    isCustom: false },
  { name: 'Education',         type: 'expense', color: '#0ea5e9', icon: 'AcademicCapIcon',             isCustom: false },
  { name: 'Travel',            type: 'expense', color: '#14b8a6', icon: 'GlobeAltIcon',               isCustom: false },
  { name: 'Family',            type: 'expense', color: '#f43f5e', icon: 'UsersIcon',                   isCustom: false },
  { name: 'Personal Care',     type: 'expense', color: '#8b5cf6', icon: 'SparklesIcon',               isCustom: false },
  { name: 'Work',              type: 'expense', color: '#4338ca', icon: 'BriefcaseIcon',              isCustom: false },
  { name: 'Financial',         type: 'expense', color: '#0891b2', icon: 'BanknotesIcon',              isCustom: false },
  { name: 'Taxes',             type: 'expense', color: '#b45309', icon: 'BuildingLibraryIcon',        isCustom: false },
  { name: 'Insurance',         type: 'expense', color: '#475569', icon: 'ShieldCheckIcon',            isCustom: false },
  { name: 'Subscriptions',     type: 'expense', color: '#7c3aed', icon: 'ArrowPathIcon',              isCustom: false },
  { name: 'Gifts & Donations', type: 'expense', color: '#dc2626', icon: 'GiftIcon',                   isCustom: false },
  { name: 'Fees & Charges',    type: 'expense', color: '#71717a', icon: 'ReceiptPercentIcon',         isCustom: false },
  { name: 'Miscellaneous',     type: 'expense', color: '#94a3b8', icon: 'EllipsisHorizontalCircleIcon', isCustom: false },
];

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(defaultCategories as Category[]);
  }
}
