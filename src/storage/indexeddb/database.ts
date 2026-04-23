import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Loan, LoanPayment, RecurringRule } from '@/types';

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  loans!: Table<Loan, number>;
  loanPayments!: Table<LoanPayment, number>;
  recurringRules!: Table<RecurringRule, number>;

  constructor() {
    super('FinanceTrackerDB');
    this.version(2).stores({
      transactions: '++id, type, date, categoryId, source, deletedAt',
      categories: '++id, type, isCustom, name, [name+type]',
      loans: '++id, direction, startDate',
      loanPayments: '++id, loanId, date',
      recurringRules: '++id, type, frequency, startDate, endDate',
    });
  }
}

export const db = new FinanceDatabase();

export async function clearAllData(): Promise<void> {
  await db.transactions.clear();
  await db.categories.clear();
  await db.loans.clear();
  await db.loanPayments.clear();
  await db.recurringRules.clear();
}

export async function exportAllData(): Promise<{
  transactions: Transaction[];
  categories: Category[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  recurringRules: RecurringRule[];
}> {
  return {
    transactions: await db.transactions.toArray(),
    categories: await db.categories.toArray(),
    loans: await db.loans.toArray(),
    loanPayments: await db.loanPayments.toArray(),
    recurringRules: await db.recurringRules.toArray(),
  };
}

export async function importData(data: {
  transactions?: Transaction[];
  categories?: Category[];
  loans?: Loan[];
  loanPayments?: LoanPayment[];
  recurringRules?: RecurringRule[];
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
}
