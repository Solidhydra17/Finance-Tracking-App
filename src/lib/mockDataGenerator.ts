import { Category, Transaction, TransactionType } from '@/types';
import { db, clearAllData } from '@/storage/indexeddb/database';
import { defaultCategories } from '@/storage/indexeddb/categoryRepository';

const NOTES = [
  'Weekly grocery run',
  'Salary payout',
  'Coffee with friends',
  'Utility bills',
  'Netflix subscription',
  'Internet bill',
  'Gas refill',
  'Shopping spree',
  'Freelance project',
  'Investment dividends',
  'Medical checkup',
  'Gym membership',
  'Restaurant dinner',
  'Bus fare',
  'Condo rent',
  'Bonus',
];

export async function seedRandomData(count: number = 50) {
  await clearAllData();

  // 1. Seed Categories
  const categoryIds: Record<string, number> = {};
  for (const cat of defaultCategories) {
    const id = await db.categories.add(cat as Category);
    categoryIds[`${cat.name}-${cat.type}`] = id;
  }

  // 2. Seed Transactions
  const transactions: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.75; // 25% chance of income
    const type: TransactionType = isIncome ? 'income' : 'expense';
    
    const possibleCategories = defaultCategories.filter(c => c.type === type);
    const category = possibleCategories[Math.floor(Math.random() * possibleCategories.length)];
    const categoryId = categoryIds[`${category.name}-${category.type}`];

    const amount = isIncome 
      ? Math.floor(Math.random() * 8000000) + 2000000 // 20k - 100k
      : Math.floor(Math.random() * 150000) + 5000;    // 50 - 2000

    const date = new Date(now);
    // Spread across 60 days
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));

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

  // Add some specific transactions for the current month to ensure it's not empty
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < 5; i++) {
    const date = new Date(currentMonthStart);
    date.setDate(date.getDate() + i);
    
    transactions.push({
      type: 'expense',
      amount: Math.floor(Math.random() * 100000) + 10000,
      date: date.toISOString().split('T')[0],
      categoryId: categoryIds['Food & Dining-expense'],
      note: 'Auto-seeded expense',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }

  await db.transactions.bulkAdd(transactions);
}
