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
  // Income Categories
  { name: 'Allowance', type: 'income', color: '#10b981', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Salary', type: 'income', color: '#059669', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Savings', type: 'income', color: '#3b82f6', icon: 'WalletIcon', isCustom: false },
  { name: 'Extra Income', type: 'income', color: '#8b5cf6', icon: 'SparklesIcon', isCustom: false },
  { name: 'Fund transfer', type: 'income', color: '#6366f1', icon: 'ArrowPathIcon', isCustom: false },
  { name: 'Insurance', type: 'income', color: '#0ea5e9', icon: 'ShieldCheckIcon', isCustom: false },
  { name: 'Loan', type: 'income', color: '#f59e0b', icon: 'CreditCardIcon', isCustom: false },
  { name: 'Others', type: 'income', color: '#94a3b8', icon: 'ArchiveBoxIcon', isCustom: false },
  { name: 'Uncategorized', type: 'income', color: '#cbd5e1', icon: 'QuestionMarkCircleIcon', isCustom: false },
  
  // Expense Categories
  { name: 'Bills', type: 'expense', color: '#ef4444', icon: 'DocumentTextIcon', isCustom: false },
  { name: 'Food', type: 'expense', color: '#f97316', icon: 'CakeIcon', isCustom: false },
  { name: 'Groceries', type: 'expense', color: '#fb923c', icon: 'ShoppingCartIcon', isCustom: false },
  { name: 'Transportation', type: 'expense', color: '#eab308', icon: 'TruckIcon', isCustom: false },
  { name: 'Rent', type: 'expense', color: '#f43f5e', icon: 'HomeIcon', isCustom: false },
  { name: 'Internet', type: 'expense', color: '#06b6d4', icon: 'WifiIcon', isCustom: false },
  { name: 'Mobile prepaid', type: 'expense', color: '#0891b2', icon: 'DevicePhoneMobileIcon', isCustom: false },
  { name: 'Online shopping', type: 'expense', color: '#ec4899', icon: 'ShoppingBagIcon', isCustom: false },
  { name: 'Subscriptions', type: 'expense', color: '#8b5cf6', icon: 'PlayIcon', isCustom: false },
  { name: 'Gas', type: 'expense', color: '#b45309', icon: 'FireIcon', isCustom: false },
  { name: 'Car', type: 'expense', color: '#475569', icon: 'WrenchScrewdriverIcon', isCustom: false },
  { name: 'Business Expense', type: 'expense', color: '#4338ca', icon: 'BriefcaseIcon', isCustom: false },
  { name: 'Fund transfer', type: 'expense', color: '#6366f1', icon: 'ArrowPathIcon', isCustom: false },
  { name: 'Loan payment', type: 'expense', color: '#dc2626', icon: 'CreditCardIcon', isCustom: false },
  { name: 'Parking fee', type: 'expense', color: '#71717a', icon: 'MapPinIcon', isCustom: false },
  { name: 'Others', type: 'expense', color: '#94a3b8', icon: 'ArchiveBoxIcon', isCustom: false },
  { name: 'Uncategorized', type: 'expense', color: '#cbd5e1', icon: 'QuestionMarkCircleIcon', isCustom: false },
];

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) {
    // Using bulkPut with unique index ensures no duplicates even if called multiple times
    await db.categories.bulkPut(defaultCategories);
  }
}
