import { db } from '@/storage/indexeddb/database';
import { getYieldCategoryId } from '@/storage/indexeddb/categoryRepository';
import { getCurrentLocalDate, getCurrentLocalTime } from '@/lib/date';
import type { BankRule, Transaction } from '@/types';
import { loanQuote, planCashback, previewBankRule, writesLedgerRow } from './calculator';
import { walletService } from '@/domain/wallet/walletService';

let isProcessing = false;

const findRole = async (ruleId: number, role: Transaction['bankRuleRole']) => {
  return db.transactions
    .filter((txn) => !txn.deletedAt && txn.bankRuleId === ruleId && txn.bankRuleRole === role)
    .first();
};

const upsertRole = async (
  rule: BankRule,
  role: Transaction['bankRuleRole'],
  amountCents: number,
  accountId: number,
  type: 'income' | 'expense',
  categoryName: 'Interest' | 'Cashback' | 'Fees & Charges',
  note: string,
  date: string,
) => {
  const existing = await findRole(rule.id!, role);
  if (amountCents <= 0) {
    if (existing?.id != null) {
      await db.transactions.update(existing.id as number, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return;
  }
  const categoryId = await getYieldCategoryId(categoryName);
  if (existing?.id != null) {
    await db.transactions.update(existing.id as number, {
      amount: amountCents,
      walletAccountId: accountId,
      type,
      categoryId,
      note,
      date,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  await db.transactions.add({
    type,
    amount: amountCents,
    date,
    time: '00:00',
    categoryId,
    note,
    source: 'bank_rule',
    bankRuleId: rule.id,
    bankRuleRole: role,
    walletAccountId: accountId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });
};

const foreignLoanOwed = async (accountId: number, ruleId: number) => {
  const txs = await db.transactions.where('walletAccountId').equals(accountId).toArray();
  let owed = 0;
  for (const txn of txs) {
    if (txn.deletedAt) continue;
    if (txn.bankRuleId === ruleId && (txn.bankRuleRole === 'loan-principal' || txn.bankRuleRole === 'loan-interest')) continue;
    if (txn.type === 'expense' || txn.type === 'fund_transfer') owed += txn.amount;
  }
  const payments = await db.transactions
    .where('targetWalletAccountId')
    .equals(accountId)
    .filter((txn) => txn.type === 'credit_payment' && !txn.deletedAt)
    .toArray();
  for (const payment of payments) owed -= payment.amount;
  return Math.max(0, owed);
};

const syncAddonLoan = async (rule: BankRule, today: string) => {
  if (!rule.id || !rule.accountId || rule.principalCents <= 0) return;
  const quote = loanQuote(rule, today);
  const foreign = await foreignLoanOwed(rule.accountId, rule.id);
  const principal = foreign < quote.principal * 0.5 ? quote.principal : 0;
  const cashback = rule.paidEarly ? (rule.earlyCashbackCents ?? quote.cashbackCents) : 0;
  if (rule.paidEarly && rule.earlyCashbackCents == null) {
    await db.bankRules.update(rule.id, { earlyCashbackCents: cashback });
  }
  const interest = Math.max(0, quote.interest - cashback);
  await upsertRole(rule, 'loan-principal', principal, rule.accountId, 'expense', 'Fees & Charges', `${rule.name} · principal`, rule.startDate);
  await upsertRole(rule, 'loan-interest', interest, rule.accountId, 'expense', 'Fees & Charges', `${rule.name} · interest`, rule.startDate);
};

const purchaseNote = (rule: BankRule, expenseId: number) => `${rule.name} cashback · purchase:${expenseId}`;

const syncCashback = async (rule: BankRule, accountType: string, today: string) => {
  const [transactions, categories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
  ]);
  const plan = planCashback(rule, accountType, transactions, categories).filter((row) => row.date <= today);
  const wanted = new Map(plan.map((row) => [row.expenseId, row]));
  const existing = transactions.filter((txn) => !txn.deletedAt && txn.bankRuleId === rule.id && txn.bankRuleRole === 'cashback' && txn.note.includes('purchase:'));
  let count = 0;
  const categoryId = plan.length > 0 || existing.length > 0 ? await getYieldCategoryId('Cashback') : 0;
  const creditCard = accountType === 'credit';

  for (const txn of existing) {
    const match = /purchase:(\d+)/.exec(txn.note);
    const expenseId = match ? Number(match[1]) : 0;
    const next = wanted.get(expenseId);
    if (!next && typeof txn.id === 'number') {
      await db.transactions.update(txn.id, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      wanted.delete(expenseId);
    }
  }

  for (const row of wanted.values()) {
    const note = purchaseNote(rule, row.expenseId);
    const current = existing.find((txn) => txn.note.endsWith(`purchase:${row.expenseId}`));
    if (current && typeof current.id === 'number') {
      if (current.amount !== row.amountCents || current.date !== row.date) {
        await db.transactions.update(current.id, {
          amount: row.amountCents,
          date: row.date,
          note,
          categoryId,
          updatedAt: new Date().toISOString(),
        });
      }
      continue;
    }
    if (creditCard) {
      await db.transactions.add({
        type: 'credit_payment',
        amount: row.amountCents,
        date: row.date,
        time: '00:00',
        categoryId,
        note,
        source: 'bank_rule',
        bankRuleId: rule.id,
        bankRuleRole: 'cashback',
        walletAccountId: rule.accountId,
        targetWalletAccountId: rule.accountId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    } else {
      await db.transactions.add({
        type: 'income',
        amount: row.amountCents,
        date: row.date,
        time: '00:00',
        categoryId,
        note,
        source: 'bank_rule',
        bankRuleId: rule.id,
        bankRuleRole: 'cashback',
        walletAccountId: rule.accountId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    }
    count++;
  }
  return count;
};

export const materializeBankRules = async (): Promise<number> => {
  if (isProcessing) return 0;
  isProcessing = true;
  try {
    const today = getCurrentLocalDate();
    const rules = await db.bankRules.toArray();
    const accounts = await walletService.getAllAccounts();
    const transactions = await db.transactions.toArray();
    let count = 0;

    for (const rule of rules) {
      if (!rule.active || !rule.id) continue;
      if (rule.kind === 'loan' && rule.method === 'addon') {
        await syncAddonLoan(rule, today);
        continue;
      }
      if (!writesLedgerRow(rule)) continue;
      if (rule.kind === 'cashback') {
        const account = accounts.find((entry) => entry.id === rule.accountId);
        if (account) count += await syncCashback(rule, account.type, today);
        continue;
      }
      const preview = previewBankRule(rule, accounts, transactions, today);
      if (!preview || preview.amountCents <= 0 || !preview.periodKey) continue;
      if (preview.date > today) continue;
      if (rule.lastPostedPeriod === preview.periodKey) continue;
      const categoryId = await getYieldCategoryId(preview.categoryName);
      await db.transactions.add({
        type: preview.txnType,
        amount: preview.amountCents,
        date: preview.date,
        time: getCurrentLocalTime(),
        categoryId,
        note: preview.note,
        source: 'bank_rule',
        bankRuleId: rule.id,
        bankRuleRole: 'credit',
        walletAccountId: preview.accountId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
      await db.bankRules.update(rule.id, {
        lastPostedPeriod: preview.periodKey,
        updatedAt: new Date().toISOString(),
      });
      count++;
    }
    return count;
  } finally {
    isProcessing = false;
  }
};

export const payLoanEarly = async (ruleId: number): Promise<{ cashbackCents: number }> => {
  const rule = await db.bankRules.get(ruleId);
  if (!rule || rule.kind !== 'loan' || rule.method !== 'addon') {
    throw new Error('That rule is not an add-on loan');
  }
  if (rule.paidEarly) throw new Error('That cashback is already in activity');
  const today = getCurrentLocalDate();
  const quote = loanQuote(rule, today);
  if (quote.cashbackCents <= 0) throw new Error('No unused month is left, so this payoff does not return interest');
  const walletId = rule.payFromAccountId;
  if (!walletId) throw new Error('Choose the account that receives the cashback');
  const categoryId = await getYieldCategoryId('Cashback');
  const span = quote.cashbackMonths.length > 1
    ? `${quote.cashbackMonths[0]} through ${quote.cashbackMonths[quote.cashbackMonths.length - 1]}`
    : quote.cashbackMonths[0];
  await db.transactions.add({
    type: 'income',
    amount: quote.cashbackCents,
    date: today,
    time: getCurrentLocalTime(),
    categoryId,
    note: `${rule.name} cashback · ${span}`,
    source: 'bank_rule',
    bankRuleId: rule.id,
    bankRuleRole: 'cashback',
    walletAccountId: walletId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });
  const next = { ...rule, paidEarly: true, earlyCashbackCents: quote.cashbackCents };
  await db.bankRules.update(ruleId, { paidEarly: true, earlyCashbackCents: quote.cashbackCents, updatedAt: new Date().toISOString() });
  await syncAddonLoan(next, today);
  return { cashbackCents: quote.cashbackCents };
};
