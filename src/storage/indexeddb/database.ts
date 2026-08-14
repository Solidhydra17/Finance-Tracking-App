import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Loan, LoanPayment, RecurringRule, BudgetPlan, BudgetItem, WalletAccount, CreditPayment } from '@/types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  loans!: Table<Loan, number>;
  loanPayments!: Table<LoanPayment, number>;
  recurringRules!: Table<RecurringRule, number>;
  budgetPlans!: Table<BudgetPlan, number>;
  budgetItems!: Table<BudgetItem, number>;
  walletAccounts!: Table<WalletAccount, number>;
  creditPayments!: Table<CreditPayment, number>;

  constructor() {
    super('FinanceTrackerDB');
    
    const categoryCleanup = async (tx: any) => {
      console.log('Starting category cleanup migration...');
      try {
        const table = tx.table('categories');
        const allCategories = await table.toArray();
        const seenKeys = new Map<string, number>();
        const duplicateIds: number[] = [];

        for (const cat of allCategories) {
          const key = `${cat.name?.trim()}-${cat.type}`.toLowerCase();
          if (seenKeys.has(key)) {
            duplicateIds.push(cat.id!);
          } else {
            seenKeys.set(key, cat.id!);
          }
        }

        if (duplicateIds.length > 0) {
          console.log(`Deleting ${duplicateIds.length} duplicate categories...`, duplicateIds);
          await table.bulkDelete(duplicateIds);
        }
        console.log('Category cleanup finished.');
      } catch (e) {
        console.error('Migration failed during cleanup:', e);
      }
    };

    // Define store for all versions from 4 to 6
    const schema = {
      transactions: '++id, type, date, categoryId, source, deletedAt',
      categories: '++id, type, isCustom, name, &[name+type]', // Enforce unique
      loans: '++id, direction, startDate',
      loanPayments: '++id, loanId, date',
      recurringRules: '++id, type, frequency, startDate, endDate',
    };

    const schemaV7 = {
      ...schema,
      transactions: '++id, type, date, categoryId, source, deletedAt, recurringRuleId',
    };

    const schemaV9 = {
      ...schemaV7,
      budgetPlans: '++id, payFrequency',
      budgetItems: '++id, type, active',
    };

    const schemaV10 = {
      ...schemaV9,
      budgetItems: '++id, type, active, categoryId',
    };

    const schemaV11 = {
      ...schemaV10,
      walletAccounts: '++id, type, name',
      transactions: '++id, type, date, categoryId, source, deletedAt, recurringRuleId, walletAccountId',
      loans: '++id, direction, personName, sourceWalletAccountId, destinationWalletAccountId, status',
      loanPayments: '++id, loanId, walletAccountId, date',
    };

    const schemaV12 = {
      ...schemaV11,
      creditPayments: '++id, creditCardAccountId, sourceWalletAccountId, date',
    };

    const schemaV13 = {
      ...schemaV12,
      transactions: '++id, type, date, categoryId, source, deletedAt, recurringRuleId, walletAccountId, targetWalletAccountId',
    };

    this.version(4).stores({ ...schema, categories: '++id, type, isCustom, name, [name+type]' }).upgrade(categoryCleanup);
    this.version(5).stores(schema).upgrade(categoryCleanup);
    this.version(6).stores(schema).upgrade(categoryCleanup);
    this.version(8).stores(schemaV7);
    this.version(9).stores(schemaV9);
    this.version(10).stores(schemaV10);
    this.version(11).stores(schemaV11).upgrade(async (tx) => {
        // 1. Wipe old loan data as requested
        await tx.table('loans').clear();
        await tx.table('loanPayments').clear();

        // 2. Create a default Cash wallet account if it doesn't exist
        const walletCount = await tx.table('walletAccounts').count();
        if (walletCount === 0) {
            await tx.table('walletAccounts').add({
                name: 'Cash',
                type: 'cash',
                balance: 0,
                createdAt: new Date().toISOString()
            });
        }
    });
    this.version(12).stores(schemaV12).upgrade(async (tx) => {
        // Remove the stored balance from existing wallet accounts
        const accounts = await tx.table('walletAccounts').toArray();
        for (const acc of accounts) {
            delete acc.balance;
            await tx.table('walletAccounts').put(acc);
        }
    });
    this.version(13).stores(schemaV13).upgrade(async () => {
        // No explicit migration needed for targetWalletAccountId, 
        // the index will be built automatically for existing records (which will have undefined).
        // We will just let the creditPayments table become obsolete.
    });
    this.version(14).stores(schemaV13); // ecash + fund_transfer — no schema index changes needed

    const schemaV15 = {
      ...schemaV13,
      recurringRules: '++id, type, frequency, startDate, endDate, *selectedDays',
      budgetItems: '++id, type, active, categoryId, *workDays',
    };
    this.version(15).stores(schemaV15);

    this.on('blocked', () => {
        console.warn('Database is blocked by another tab. Please close other tabs.');
    });
  }
}

export const db = new FinanceDatabase();

export async function ensureFreshInstallDefaults(): Promise<void> {
  // Ensure default Cash wallet account exists
  const walletCount = await db.walletAccounts.count();
  if (walletCount === 0) {
    await db.walletAccounts.add({
      name: 'Cash',
      type: 'cash',
      balance: 0,
      createdAt: new Date().toISOString(),
    });
  }

  // Ensure default categories exist
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const { seedDefaultCategories } = await import('./categoryRepository');
    await seedDefaultCategories();
  }
}

export async function clearAllData(): Promise<void> {
  await db.transactions.clear();
  await db.loans.clear();
  await db.loanPayments.clear();
  await db.recurringRules.clear();
  await db.budgetPlans.clear();
  await db.budgetItems.clear();
  await db.walletAccounts.clear();
  await db.creditPayments.clear();

  // Re-add default Cash account
  await db.walletAccounts.add({
      name: 'Cash',
      type: 'cash',
      balance: 0,
      createdAt: new Date().toISOString()
  });

  // Re-seed categories
  const { seedDefaultCategories } = await import('./categoryRepository');
  await db.categories.clear();
  await seedDefaultCategories();
}


export async function exportAllData(): Promise<any> {
  const data = {
    transactions: await db.transactions.toArray(),
    categories: await db.categories.toArray(),
    loans: await db.loans.toArray(),
    loanPayments: await db.loanPayments.toArray(),
    recurringRules: await db.recurringRules.toArray(),
    budgetPlans: await db.budgetPlans.toArray(),
    budgetItems: await db.budgetItems.toArray(),
    walletAccounts: await db.walletAccounts.toArray(),
    creditPayments: await db.creditPayments.toArray(),
  };

  return {
    format: 'kuripot-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

export async function importData(payload: any): Promise<void> {
  // 1. Validation
  let dataToImport = payload;
  
  if (payload && payload.format === 'kuripot-backup') {
    dataToImport = payload.data;
  } else if (payload && typeof payload === 'object' && !payload.format) {
    // Legacy support for bare exports
    dataToImport = payload;
    // Check if it at least resembles our tables
    if (!('transactions' in dataToImport) && !('categories' in dataToImport) && !('walletAccounts' in dataToImport)) {
      throw new Error('Invalid backup file format');
    }
  } else {
    throw new Error('Invalid backup file format');
  }

  if (!dataToImport || typeof dataToImport !== 'object') {
    throw new Error('Invalid backup data');
  }

  // 2. Atomic Restore (REPLACE behavior)
  await db.transaction('rw', 
    [db.transactions, db.categories, db.loans, db.loanPayments, 
    db.recurringRules, db.budgetPlans, db.budgetItems, 
    db.walletAccounts, db.creditPayments], 
    async () => {
      // Clear existing data
      await db.transactions.clear();
      await db.categories.clear();
      await db.loans.clear();
      await db.loanPayments.clear();
      await db.recurringRules.clear();
      await db.budgetPlans.clear();
      await db.budgetItems.clear();
      await db.walletAccounts.clear();
      await db.creditPayments.clear();

      // Restore data
      if (dataToImport.categories?.length) {
        await db.categories.bulkPut(dataToImport.categories);
      }
      if (dataToImport.transactions?.length) {
        await db.transactions.bulkPut(dataToImport.transactions);
      }
      if (dataToImport.loans?.length) {
        await db.loans.bulkPut(dataToImport.loans);
      }
      if (dataToImport.loanPayments?.length) {
        await db.loanPayments.bulkPut(dataToImport.loanPayments);
      }
      if (dataToImport.recurringRules?.length) {
        await db.recurringRules.bulkPut(dataToImport.recurringRules);
      }
      if (dataToImport.budgetPlans?.length) {
        await db.budgetPlans.bulkPut(dataToImport.budgetPlans);
      }
      if (dataToImport.budgetItems?.length) {
        await db.budgetItems.bulkPut(dataToImport.budgetItems);
      }
      if (dataToImport.walletAccounts?.length) {
        await db.walletAccounts.bulkPut(dataToImport.walletAccounts);
      }
      if (dataToImport.creditPayments?.length) {
        await db.creditPayments.bulkPut(dataToImport.creditPayments);
      }
    }
  );
}
