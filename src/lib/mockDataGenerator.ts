import { Category, Transaction, TransactionType } from '@/types';
import { db, clearAllData } from '@/storage/indexeddb/database';

const CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#10b981', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Freelance', type: 'income', color: '#3b82f6', icon: 'BriefcaseIcon', isCustom: false },
  { name: 'Food', type: 'expense', color: '#ef4444', icon: 'CakeIcon', isCustom: false },
  { name: 'Transport', type: 'expense', color: '#f59e0b', icon: 'TruckIcon', isCustom: false },
  { name: 'Housing', type: 'expense', color: '#8b5cf6', icon: 'HomeIcon', isCustom: false },
  { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: 'MusicalNoteIcon', isCustom: false },
  { name: 'Health', type: 'expense', color: '#06b6d4', icon: 'HeartIcon', isCustom: false },
  { name: 'Utilities', type: 'expense', color: '#64748b', icon: 'LightBulbIcon', isCustom: false },
];

const NOTES = [
  'Lunch with friends',
  'Weekly groceries',
  'Gas station',
  'Monthly rent',
  'Netflix subscription',
  'Gym membership',
  'Coffee shop',
  'Bus ticket',
  'Freelance project payout',
  'Monthly salary',
  'Dinner out',
  'Pharmacy',
];

export async function seedRandomData(count: number = 20) {
  await clearAllData();

  // 1. Seed Categories
  const categoryIds: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const id = await db.categories.add(cat as Category);
    categoryIds[cat.name] = id;
  }

  // 2. Seed Transactions
  const transactions: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.7; // 30% chance of income
    const type: TransactionType = isIncome ? 'income' : 'expense';
    
    const possibleCategories = CATEGORIES.filter(c => c.type === type || c.type === 'both');
    const category = possibleCategories[Math.floor(Math.random() * possibleCategories.length)];
    const categoryId = categoryIds[category.name];

    const amount = isIncome 
      ? Math.floor(Math.random() * 500000) + 100000 // 1000 - 6000
      : Math.floor(Math.random() * 50000) + 1000;    // 10 - 510

    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

    transactions.push({
      type,
      amount,
      date: date.toISOString().split('T')[0],
      categoryId,
      note: NOTES[Math.floor(Math.random() * NOTES.length)],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }

  await db.transactions.bulkAdd(transactions);
}
