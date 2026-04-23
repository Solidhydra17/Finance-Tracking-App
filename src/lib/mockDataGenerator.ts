import { Category, Transaction, TransactionType } from '@/types';
import { db, clearAllData } from '@/storage/indexeddb/database';

const CATEGORIES: Omit<Category, 'id'>[] = [
  // Income Categories
  { name: 'Allowance', type: 'income', color: '#10b981', icon: 'BanknotesIcon', isCustom: false },
  { name: 'Savings', type: 'income', color: '#3b82f6', icon: 'ArrowPathIcon', isCustom: false },
  { name: 'Extra Income', type: 'income', color: '#8b5cf6', icon: 'SparklesIcon', isCustom: false },
  { name: 'Fund transfer', type: 'income', color: '#f59e0b', icon: 'ArrowsRightLeftIcon', isCustom: false },
  { name: 'Insurance', type: 'income', color: '#ec4899', icon: 'ShieldCheckIcon', isCustom: false },
  { name: 'Loan', type: 'income', color: '#64748b', icon: 'DocumentTextIcon', isCustom: false },
  { name: 'Salary', type: 'income', color: '#059669', icon: 'CurrencyDollarIcon', isCustom: false },
  { name: 'Others', type: 'income', color: '#94a3b8', icon: 'EllipsisHorizontalCircleIcon', isCustom: false },
  { name: 'Uncategorized', type: 'income', color: '#cbd5e1', icon: 'QuestionMarkCircleIcon', isCustom: false },

  // Expense Categories
  { name: 'Bills', type: 'expense', color: '#ef4444', icon: 'NewspaperIcon', isCustom: false },
  { name: 'Business Expense', type: 'expense', color: '#4338ca', icon: 'BriefcaseIcon', isCustom: false },
  { name: 'Car', type: 'expense', color: '#6366f1', icon: 'TruckIcon', isCustom: false },
  { name: 'Gas', type: 'expense', color: '#f97316', icon: 'FireIcon', isCustom: false },
  { name: 'Food', type: 'expense', color: '#f43f5e', icon: 'CakeIcon', isCustom: false },
  { name: 'Fund transfer', type: 'expense', color: '#f59e0b', icon: 'ArrowsRightLeftIcon', isCustom: false },
  { name: 'Groceries', type: 'expense', color: '#10b981', icon: 'ShoppingCartIcon', isCustom: false },
  { name: 'Loan Payment', type: 'expense', color: '#7c3aed', icon: 'ReceiptPercentIcon', isCustom: false },
  { name: 'Internet', type: 'expense', color: '#06b6d4', icon: 'WifiIcon', isCustom: false },
  { name: 'Mobile Prepaid', type: 'expense', color: '#8b5cf6', icon: 'DevicePhoneMobileIcon', isCustom: false },
  { name: 'Online Shopping', type: 'expense', color: '#ec4899', icon: 'ShoppingBagIcon', isCustom: false },
  { name: 'Parking Fee', type: 'expense', color: '#64748b', icon: 'NoSymbolIcon', isCustom: false },
  { name: 'Rent', type: 'expense', color: '#475569', icon: 'HomeIcon', isCustom: false },
  { name: 'Subscriptions', type: 'expense', color: '#dc2626', icon: 'PlayIcon', isCustom: false },
  { name: 'Transportation', type: 'expense', color: '#fbbf24', icon: 'MapIcon', isCustom: false },
  { name: 'Others', type: 'expense', color: '#94a3b8', icon: 'EllipsisHorizontalCircleIcon', isCustom: false },
  { name: 'Uncategorized', type: 'expense', color: '#cbd5e1', icon: 'QuestionMarkCircleIcon', isCustom: false },
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

  // 1. Seed Categories (Smart Upsert)
  const categoryIds: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    let existing = await db.categories
      .where('[name+type]')
      .equals([cat.name, cat.type])
      .first();
    
    if (existing) {
      categoryIds[cat.name] = existing.id!;
    } else {
      const id = await db.categories.add(cat as Category);
      categoryIds[cat.name] = id;
    }
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
