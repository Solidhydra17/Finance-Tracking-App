import { formatDateLocal } from '@/lib/date';
import type { BankRule, BankRuleKind, Transaction, WalletAccount } from '@/types';

export interface YieldPreview {
  amountCents: number;
  date: string;
  periodKey: string;
  txnType: 'income' | 'expense';
  accountId: number;
  categoryName: 'Interest' | 'Cashback' | 'Fees & Charges';
  note: string;
  headline: string;
  summary: string;
}

export interface LoanQuote {
  principal: number;
  interest: number;
  amountToPay: number;
  perMonth: number;
  cashbackCents: number;
  cashbackMonths: string[];
  nextDue: string;
}

const roundCents = (value: number) => Math.round(value);

const pad = (value: number) => String(value).padStart(2, '0');

export const monthEndIso = (iso: string) => {
  const [year, month] = iso.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(last)}`;
};

export const addMonthsIso = (iso: string, months: number) => {
  const [year, month, day] = iso.split('-').map(Number);
  return formatDateLocal(new Date(year, month - 1 + months, day));
};

const previousMonthEnd = (iso: string) => {
  const [year, month] = iso.split('-').map(Number);
  return formatDateLocal(new Date(year, month - 1, 0));
};

const netOfTax = (grossCents: number, taxPct: number) => grossCents * (1 - taxPct / 100);

const completedMonth = (today: string, startDate: string) => {
  const endThis = monthEndIso(today);
  const date = today >= endThis ? endThis : previousMonthEnd(today);
  if (date < startDate) return null;
  return { date, periodKey: date.slice(0, 7) };
};

export const savingsRatePct = (rule: BankRule, balanceCents: number) => {
  if ((rule.tierStyle ?? 'excess') === 'whole') {
    const topFrom = rule.tierTopFromCents ?? 0;
    if (topFrom > 0 && balanceCents >= topFrom) return rule.tierTopRatePct ?? 0;
    if (rule.tierFromCents > 0 && balanceCents >= rule.tierFromCents) return rule.tierRatePct;
    return rule.ratePct;
  }
  return rule.ratePct;
};

const dailyGross = (balanceCents: number, rule: BankRule) => {
  if (balanceCents < rule.minBalanceCents) return 0;
  const slice = (amountCents: number, ratePct: number) => amountCents * (ratePct / 100) / rule.dayCount;
  if ((rule.tierStyle ?? 'excess') === 'whole') {
    return slice(balanceCents, savingsRatePct(rule, balanceCents));
  }
  if (rule.tierFromCents > 0 && rule.tierRatePct > 0 && balanceCents > rule.tierFromCents) {
    return slice(rule.tierFromCents, rule.ratePct) + slice(balanceCents - rule.tierFromCents, rule.tierRatePct);
  }
  return slice(balanceCents, rule.ratePct);
};

export const dueDates = (rule: BankRule) => {
  const start = rule.startDate;
  const count = Math.max(1, rule.tenorMonths);
  const day = pad(Math.min(28, Math.max(1, rule.dueDay || 1)));
  return Array.from({ length: count }, (_, index) => `${addMonthsIso(start, index + 1).slice(0, 8)}${day}`);
};

export const loanQuote = (rule: BankRule, payDate: string): LoanQuote => {
  const principal = rule.principalCents;
  const months = Math.max(1, rule.tenorMonths);
  const interest = roundCents(principal * (rule.monthlyRatePct / 100) * months);
  const perMonth = roundCents(interest / months);
  const dues = dueDates(rule);
  const nextDue = dues.find((date) => date > payDate) ?? '';
  const cashbackMonths = nextDue ? dues.filter((date) => date > nextDue) : [];
  return {
    principal,
    interest,
    amountToPay: principal + interest,
    perMonth,
    cashbackCents: perMonth * cashbackMonths.length,
    cashbackMonths,
    nextDue,
  };
};

const pesos = (cents: number) => `₱${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const nameWords = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const hasWord = (name: string, words: string[]) => {
  const parts = nameWords(name);
  return words.some((word) => parts.includes(word));
};

const MARIBANK_EXCLUDED = ['utilities', 'utility', 'transportation', 'transport', 'donation', 'donations', 'charity', 'charities', 'taxes', 'tax', 'government', 'fee', 'fees', 'gambling', 'casino'];
const MARIBANK_CAPPED = ['food', 'drinks', 'drink', 'health', 'grocery', 'groceries', 'supermarket', 'drugstore', 'pharmacy', 'fuel', 'petroleum', 'gasoline', 'gas'];

export const cashbackScopeOf = (rule: BankRule): 'all' | 'group' =>
  rule.cashbackCapScope ?? (rule.preset === 'maribank-credit' ? 'group' : 'all');

const usesMariBankNames = (rule: BankRule) =>
  rule.cashbackNames === 'maribank' || rule.preset === 'maribank-debit' || rule.preset === 'maribank-credit';

/** MariBank drops cashback below ₱0.005 and rounds ₱0.005 and above up to the next centavo. */
export const cashbackForPurchase = (amountCents: number, pct: number) => {
  if (amountCents <= 0 || pct <= 0) return 0;
  const centavos = amountCents * (pct / 100);
  if (centavos < 0.5) return 0;
  return Math.ceil(centavos - 1e-9);
};

export const statementDateFor = (expenseDate: string, day: number) => {
  const due = Math.min(28, Math.max(1, day || 15));
  const [year, month, date] = expenseDate.split('-').map(Number);
  const stamp = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-${String(due).padStart(2, '0')}`;
  if (date <= due) return stamp(year, month);
  if (month === 12) return stamp(year + 1, 1);
  return stamp(year, month + 1);
};

export interface CashbackPosting {
  expenseId: number;
  amountCents: number;
  date: string;
  month: string;
}

export const planCashback = (
  rule: BankRule,
  accountType: string,
  transactions: Transaction[],
  categories: { id?: number; name: string }[],
): CashbackPosting[] => {
  const names = new Map(categories.filter((entry) => entry.id != null).map((entry) => [entry.id as number, entry.name]));
  const scope = cashbackScopeOf(rule);
  const named = usesMariBankNames(rule);
  const creditCard = accountType === 'credit';
  const spent = new Map<string, number>();
  const postings: CashbackPosting[] = [];
  const purchases = transactions
    .filter((txn) => !txn.deletedAt && txn.type === 'expense' && txn.source !== 'bank_rule' && txn.walletAccountId === rule.accountId && typeof txn.id === 'number' && txn.date >= rule.startDate)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id));

  for (const txn of purchases) {
    const month = txn.date.slice(0, 7);
    const legacy = transactions.some((row) => !row.deletedAt && row.bankRuleId === rule.id && row.source === 'bank_rule' && row.note === `${rule.name} · ${month}`);
    if (legacy) continue;
    const name = names.get(txn.categoryId) || '';
    if (rule.excludedCategoryIds.includes(txn.categoryId)) continue;
    if (named && hasWord(name, MARIBANK_EXCLUDED)) continue;
    let reward = cashbackForPurchase(txn.amount, rule.cashbackPct);
    if (reward <= 0) continue;
    const cappedKind = named && hasWord(name, MARIBANK_CAPPED);
    const sharesCap = scope === 'all' || cappedKind;
    if (sharesCap && rule.monthlyCapCents > 0) {
      const used = spent.get(month) || 0;
      const room = Math.max(0, rule.monthlyCapCents - used);
      reward = Math.min(reward, room);
      if (reward <= 0) continue;
      spent.set(month, used + reward);
    }
    const date = creditCard ? statementDateFor(txn.date, rule.dueDay || 15) : txn.date;
    postings.push({ expenseId: txn.id as number, amountCents: reward, date, month });
  }
  return postings;
};

export const previewBankRule = (
  rule: BankRule,
  accounts: WalletAccount[],
  transactions: Transaction[],
  today: string,
  categories: { id?: number; name: string }[] = [],
): YieldPreview | null => {
  const account = accounts.find((entry) => entry.id === rule.accountId);
  if (!account || today < rule.startDate) return null;
  const balance = account.balance || 0;

  if (rule.kind === 'savings') {
    const gross = dailyGross(balance, rule);
    const dailyNet = roundCents(netOfTax(gross, rule.taxPct));
    if (rule.creditWhen === 'daily') {
      if (dailyNet <= 0) return null;
      return {
        amountCents: dailyNet,
        date: today,
        periodKey: today,
        txnType: 'income',
        accountId: account.id!,
        categoryName: 'Interest',
        note: `${rule.name} · ${today}`,
        headline: 'Today, after tax',
        summary: (rule.tierStyle ?? 'excess') === 'whole'
          ? `${savingsRatePct(rule, balance)}% on the whole balance, after ${rule.taxPct}% tax.`
          : `${rule.ratePct}% a year, after ${rule.taxPct}% tax.`,
      };
    }
    const due = completedMonth(today, rule.startDate);
    const days = due ? Number(due.date.slice(8, 10)) : 0;
    const monthlyNet = roundCents(netOfTax(gross * days, rule.taxPct));
    if (!due || monthlyNet <= 0) return null;
    return {
      amountCents: monthlyNet,
      date: due.date,
      periodKey: due.periodKey,
      txnType: 'income',
      accountId: account.id!,
      categoryName: 'Interest',
      note: `${rule.name} · ${due.periodKey}`,
      headline: 'After tax',
      summary: (rule.tierStyle ?? 'excess') === 'whole'
        ? `${savingsRatePct(rule, balance)}% on the whole balance, after ${rule.taxPct}% tax, at month-end.`
        : `${rule.ratePct}% a year, after ${rule.taxPct}% tax, at month-end.`,
    };
  }

  if (rule.kind === 'cashback') {
    const postings = planCashback(rule, account.type, transactions, categories);
    const todayRows = postings.filter((row) => row.date === today);
    const nextDate = postings.map((row) => row.date).filter((date) => date > today).sort()[0];
    const nextRows = nextDate ? postings.filter((row) => row.date === nextDate) : [];
    const shown = todayRows.length > 0 ? todayRows : nextRows;
    const amountCents = shown.reduce((sum, row) => sum + row.amountCents, 0);
    const scope = cashbackScopeOf(rule);
    const cap = rule.monthlyCapCents > 0 ? `, cap ${pesos(rule.monthlyCapCents)}` : '';
    const creditCard = account.type === 'credit';
    const summary = creditCard
      ? scope === 'group'
        ? `${rule.cashbackPct}% of each purchase. Food, health, and fuel share one cap${cap}. Other eligible purchases have no cap. Pays the card down on day ${rule.dueDay || 15}.`
        : `${rule.cashbackPct}% of each eligible purchase${cap}. Pays the card down on day ${rule.dueDay || 15}.`
      : usesMariBankNames(rule)
        ? `${rule.cashbackPct}% of each purchase, added to this account the same day. Utilities, transportation, donations, taxes, and fees are skipped${cap}.`
        : `${rule.cashbackPct}% of each expense, added to this account${cap}.`;
    return {
      amountCents,
      date: shown[0]?.date ?? today,
      periodKey: shown[0]?.month ?? today.slice(0, 7),
      txnType: 'income',
      accountId: account.id!,
      categoryName: 'Cashback',
      note: `${rule.name} cashback`,
      headline: todayRows.length > 0 ? 'Cashback today' : nextDate ? (creditCard ? 'On the statement date' : 'On the purchase date') : 'Cashback',
      summary,
    };
  }

  if (rule.kind === 'deposit') {
    const months = Math.max(1, rule.tenorMonths);
    const mature = addMonthsIso(rule.startDate, months);
    const monthlyNet = roundCents(netOfTax(balance * (rule.ratePct / 100) / 12, rule.taxPct));
    const termNet = roundCents(netOfTax(balance * (rule.ratePct / 100) * (months / 12), rule.taxPct));
    if (rule.creditWhen === 'maturity') {
      if (today < mature || termNet <= 0) return null;
      return {
        amountCents: termNet,
        date: mature,
        periodKey: 'maturity',
        txnType: 'income',
        accountId: account.id!,
        categoryName: 'Interest',
        note: `${rule.name} · maturity`,
        headline: 'Maturity interest',
        summary: `${rule.ratePct}% for ${months} months, paid once on ${mature}.`,
      };
    }
    const due = completedMonth(today, rule.startDate);
    if (!due || monthlyNet <= 0) return null;
    const destinationId = rule.payFromAccountId || account.id!;
    const destination = accounts.find((entry) => entry.id === destinationId)?.name ?? account.name;
    return {
      amountCents: monthlyNet,
      date: due.date,
      periodKey: due.periodKey,
      txnType: 'income',
      accountId: destinationId,
      categoryName: 'Interest',
      note: `${rule.name} · ${due.periodKey}`,
      headline: 'This month',
      summary: `${rule.ratePct}% for ${months} months, ${pesos(monthlyNet)} a month to ${destination}.`,
    };
  }

  if (rule.method === 'revolving') {
    const due = completedMonth(today, rule.startDate);
    if (!due || rule.paidInFull) return null;
    const finance = roundCents(balance * (rule.monthlyRatePct / 100));
    if (finance <= 0) return null;
    return {
      amountCents: finance,
      date: due.date,
      periodKey: due.periodKey,
      txnType: 'expense',
      accountId: account.id!,
      categoryName: 'Fees & Charges',
      note: `${rule.name} · ${due.periodKey}`,
      headline: 'Finance charge',
      summary: `${rule.monthlyRatePct}% of the balance.`,
    };
  }

  const quote = loanQuote(rule, today);
  const returned = rule.paidEarly ? (rule.earlyCashbackCents ?? quote.cashbackCents) : quote.cashbackCents;
  const remaining = quote.amountToPay - (rule.paidEarly ? returned : 0);
  return {
    amountCents: remaining,
    date: today,
    periodKey: '',
    txnType: 'expense',
    accountId: account.id!,
    categoryName: 'Fees & Charges',
    note: rule.name,
    headline: 'Amount to pay',
    summary: rule.paidEarly
      ? `${pesos(returned)} returned. ${pesos(remaining)} still to pay.`
      : `${pesos(quote.principal)} plus ${pesos(quote.interest)} interest. Early payoff returns ${pesos(quote.cashbackCents)}.`,
  };
};

export const writesLedgerRow = (rule: BankRule) => !(rule.kind === 'loan' && rule.method === 'addon');

export const emptyBankRule = (today: string): BankRule => ({
  kind: 'savings',
  name: '',
  accountId: 0,
  active: true,
  preset: 'custom',
  ratePct: 3.25,
  tierStyle: 'excess',
  tierRatePct: 0,
  tierFromCents: 0,
  tierTopRatePct: 0,
  tierTopFromCents: 0,
  dayCount: 365,
  creditWhen: 'daily',
  taxPct: 20,
  minBalanceCents: 0,
  cashbackPct: 1,
  monthlyCapCents: 0,
  cashbackCapScope: 'all',
  cashbackNames: 'none',
  excludedCategoryIds: [],
  monthlyRatePct: 2.99,
  tenorMonths: 12,
  principalCents: 0,
  processingPct: 3,
  includeDst: true,
  lateFixedPct: 1,
  lateDailyPct: 0.15,
  lateFeeCents: 0,
  dueDay: 10,
  method: 'addon',
  paidInFull: false,
  paidEarly: false,
  startDate: today,
  lastPostedPeriod: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const bankRulePresets: Array<{ id: string; kind: BankRuleKind; label: string; patch: Partial<BankRule> }> = [
  { id: 'maribank', kind: 'savings', label: 'MariBank', patch: { tierStyle: 'excess', ratePct: 3.25, tierRatePct: 3.75, tierFromCents: 100_000_000, tierTopRatePct: 0, tierTopFromCents: 0, dayCount: 365, creditWhen: 'daily', taxPct: 20, minBalanceCents: 0 } },
  { id: 'unoready', kind: 'savings', label: 'UNOready', patch: { tierStyle: 'whole', ratePct: 3, tierRatePct: 3.5, tierFromCents: 500_000, tierTopRatePct: 1, tierTopFromCents: 500_000_000, dayCount: 365, creditWhen: 'daily', taxPct: 20, minBalanceCents: 0 } },
  { id: 'bdo', kind: 'savings', label: 'BDO passbook', patch: { tierStyle: 'excess', ratePct: 0.0625, tierRatePct: 0, tierFromCents: 0, tierTopRatePct: 0, tierTopFromCents: 0, dayCount: 365, creditWhen: 'month-end', taxPct: 20, minBalanceCents: 1_000_000 } },
  { id: 'maribank-debit', kind: 'cashback', label: 'MariBank debit', patch: { cashbackPct: 1, monthlyCapCents: 300_000, cashbackCapScope: 'all', cashbackNames: 'maribank', excludedCategoryIds: [] } },
  { id: 'maribank-credit', kind: 'cashback', label: 'MariBank credit', patch: { cashbackPct: 1, monthlyCapCents: 300_000, cashbackCapScope: 'group', cashbackNames: 'maribank', dueDay: 15, excludedCategoryIds: [] } },
  { id: 'gloan', kind: 'loan', label: 'GLoan', patch: { method: 'addon', monthlyRatePct: 2.99, tenorMonths: 12, processingPct: 3, includeDst: true, lateFixedPct: 1, lateDailyPct: 0.15, dueDay: 10, paidInFull: false } },
  { id: 'card-finance', kind: 'loan', label: 'Card finance', patch: { method: 'revolving', monthlyRatePct: 3, lateFeeCents: 85_000, paidInFull: true } },
  { id: 'unoearn', kind: 'deposit', label: 'UNOearn', patch: { ratePct: 4.75, tenorMonths: 12, creditWhen: 'month-end', taxPct: 20 } },
  { id: 'unoboost', kind: 'deposit', label: 'UNOboost', patch: { ratePct: 5, tenorMonths: 12, creditWhen: 'maturity', taxPct: 20 } },
];
