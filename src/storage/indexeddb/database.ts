import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Loan, LoanPayment, RecurringRule, BudgetPlan, BudgetItem } from '@/types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  loans!: Table<Loan, number>;
  loanPayments!: Table<LoanPayment, number>;
  recurringRules!: Table<RecurringRule, number>;
  budgetPlans!: Table<BudgetPlan, number>;
  budgetItems!: Table<BudgetItem, number>;

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

    this.version(4).stores({ ...schema, categories: '++id, type, isCustom, name, [name+type]' }).upgrade(categoryCleanup);
    this.version(5).stores(schema).upgrade(categoryCleanup);
    this.version(6).stores(schema).upgrade(categoryCleanup);
    this.version(8).stores(schemaV7);
    this.version(9).stores(schemaV9);
    this.version(10).stores(schemaV10);

    this.on('blocked', () => {
        console.warn('Database is blocked by another tab. Please close other tabs.');
    });
  }
}

export const db = new FinanceDatabase();

export async function clearAllData(): Promise<void> {
  await db.transactions.clear();
  await db.loans.clear();
  await db.loanPayments.clear();
  await db.recurringRules.clear();
  await db.budgetPlans.clear();
  await db.budgetItems.clear();
}

export async function exportAllData(): Promise<{
  transactions: Transaction[];
  categories: Category[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  recurringRules: RecurringRule[];
  budgetPlans: BudgetPlan[];
  budgetItems: BudgetItem[];
}> {
  return {
    transactions: await db.transactions.toArray(),
    categories: await db.categories.toArray(),
    loans: await db.loans.toArray(),
    loanPayments: await db.loanPayments.toArray(),
    recurringRules: await db.recurringRules.toArray(),
    budgetPlans: await db.budgetPlans.toArray(),
    budgetItems: await db.budgetItems.toArray(),
  };
}

export async function importData(data: {
  transactions?: Transaction[];
  categories?: Category[];
  loans?: Loan[];
  loanPayments?: LoanPayment[];
  recurringRules?: RecurringRule[];
  budgetPlans?: BudgetPlan[];
  budgetItems?: BudgetItem[];
}): Promise<void> {
  if (data.categories?.length) {
    await db.categories.bulkPut(data.categories);
  }
  if (data.transactions?.length) {
    await db.transactions.bulkPut(data.transactions);
  }
  if (data.loans?.length) {
    await db.loans.bulkPut(data.loans);
  }
  if (data.loanPayments?.length) {
    await db.loanPayments.bulkPut(data.loanPayments);
  }
  if (data.recurringRules?.length) {
    await db.recurringRules.bulkPut(data.recurringRules);
  }
  if (data.budgetPlans?.length) {
    await db.budgetPlans.bulkPut(data.budgetPlans);
  }
  if (data.budgetItems?.length) {
    await db.budgetItems.bulkPut(data.budgetItems);
  }
}
