import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import { db } from '@/storage/indexeddb/database';
import { useUIStore, useWalletStore, useTransactionStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '@/lib/money';
import { getCurrentLocalDate } from '@/lib/date';
import { refreshFinancialState } from '@/lib/financialState';
import type { BankRule, BankRuleKind, Transaction, WalletAccount } from '@/types';
import { bankRulePresets, emptyBankRule, previewBankRule } from '@/domain/yield/calculator';
import { materializeBankRules, payLoanEarly } from '@/domain/yield/materializer';

const kindLabel: Record<BankRuleKind, string> = {
  savings: 'Interest',
  cashback: 'Cashback',
  loan: 'Loan',
  deposit: 'Deposit',
};

const selectClass = 'w-full min-h-11 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 text-[var(--text-main)]';

const accountsFor = (draft: BankRule, accounts: WalletAccount[]) => {
  if (draft.kind === 'savings') return accounts.filter((account) => account.type === 'cash' || account.type === 'debit' || account.type === 'ecash');
  if (draft.kind === 'cashback') return accounts.filter((account) => account.type === 'debit' || account.type === 'ecash' || account.type === 'credit');
  if (draft.kind === 'deposit') return accounts.filter((account) => account.type === 'deposit');
  if (draft.method === 'revolving') return accounts.filter((account) => account.type === 'credit');
  return accounts.filter((account) => account.type === 'loan');
};

const pesosToCents = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

export const BankRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const today = getCurrentLocalDate();
  const { addToast, currencySymbol, currencyPosition } = useUIStore();
  const { accounts, fetchAccounts } = useWalletStore(useShallow((state) => ({ accounts: state.accounts, fetchAccounts: state.fetchAccounts })));
  const invalidateCache = useTransactionStore((state) => state.invalidateCache);
  const [rules, setRules] = useState<BankRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [draft, setDraft] = useState<BankRule | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [nextRules, nextTransactions] = await Promise.all([
      db.bankRules.toArray(),
      db.transactions.toArray(),
    ]);
    setRules(nextRules);
    setTransactions(nextTransactions);
    await fetchAccounts();
  };

  useEffect(() => {
    void load();
  }, []);

  const refresh = async () => {
    await materializeBankRules();
    await refreshFinancialState();
    invalidateCache();
    await load();
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.accountId) {
      addToast('warning', 'Name the rule and choose the account');
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (draft.id) {
        await db.bankRules.update(draft.id, { ...draft, updatedAt: now });
      } else {
        await db.bankRules.add({ ...draft, createdAt: now, updatedAt: now });
      }
      setDraft(null);
      await refresh();
      addToast('success', 'Rule saved');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not save the rule');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    await db.bankRules.delete(id);
    await refresh();
  };

  const handlePayEarly = async () => {
    if (!draft?.id) return;
    setBusy(true);
    try {
      const result = await payLoanEarly(draft.id);
      setDraft(null);
      await refresh();
      addToast('success', `${formatCurrency(result.cashbackCents, currencySymbol, currencyPosition)} cashback added`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not record the payoff');
    } finally {
      setBusy(false);
    }
  };

  const preview = useMemo(
    () => (draft ? previewBankRule(draft, accounts, transactions, today) : null),
    [draft, accounts, transactions, today],
  );
  const choices = draft ? accountsFor(draft, accounts) : [];
  const wallets = accounts.filter((account) => account.type === 'cash' || account.type === 'debit' || account.type === 'ecash' || account.type === 'deposit');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (draft ? setDraft(null) : navigate(-1))}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--text-main)] hover:bg-[var(--item-bg)]"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-midblue dark:text-white">
            {draft ? (draft.id ? 'Edit rule' : 'New rule') : 'Bank rules'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {draft ? kindLabel[draft.kind] : 'Interest, cashback, loans, and deposits'}
          </p>
        </div>
      </div>

      {!draft && (
        <>
          <Button type="button" onClick={() => setDraft(emptyBankRule(today))} className="w-full">
            Add a rule
          </Button>
          {rules.length === 0 && (
            <p className="rounded-3xl border border-dashed border-[var(--card-border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No rules yet. Add one for a savings account, a card, a loan, or a time deposit.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {rules.map((rule) => {
              const view = previewBankRule(rule, accounts, transactions, today);
              return (
                <li key={rule.id} className="flex items-center gap-3 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                  <button type="button" onClick={() => setDraft(rule)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-midblue/10 text-sm font-extrabold text-midblue">
                      {kindLabel[rule.kind].slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-[var(--text-main)]">{rule.name}</span>
                      <span className="block truncate text-sm text-[var(--text-muted)]">{view?.summary ?? kindLabel[rule.kind]}</span>
                    </span>
                  </button>
                  <span className="shrink-0 text-sm font-extrabold text-[var(--text-main)]">
                    {view ? formatCurrency(view.amountCents, currencySymbol, currencyPosition) : ''}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${rule.name}`}
                    onClick={() => rule.id && void handleDelete(rule.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--text-muted)] hover:bg-[var(--item-bg)] hover:text-danger-500"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {draft && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border-2 border-midblue bg-midblue px-5 py-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">{preview?.headline ?? 'Set up'}</p>
            <p className="mt-1 text-3xl font-black tracking-tight">
              {preview ? formatCurrency(preview.amountCents, currencySymbol, currencyPosition) : '—'}
            </p>
            <p className="mt-2 text-sm text-blue-100">{preview?.summary ?? 'Choose the account and the rate.'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(kindLabel) as BankRuleKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setDraft({ ...draft, kind, preset: 'custom', accountId: 0 })}
                className={`min-h-11 rounded-full px-4 text-sm font-bold ${draft.kind === kind ? 'bg-midblue text-white' : 'bg-[var(--item-bg)] text-[var(--text-main)]'}`}
              >
                {kindLabel[kind]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {bankRulePresets.filter((preset) => preset.kind === draft.kind).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDraft({ ...draft, ...preset.patch, preset: preset.id, accountId: draft.accountId })}
                className={`min-h-11 rounded-full px-4 text-sm font-bold ${draft.preset === preset.id ? 'bg-midblue text-white' : 'border border-midblue/30 text-midblue'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Input
            label="Name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value, preset: 'custom' })}
            placeholder="MariBank savings"
          />

          <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
            Account
            <select
              value={draft.accountId || ''}
              onChange={(event) => setDraft({ ...draft, accountId: Number(event.target.value) })}
              className={selectClass}
            >
              <option value="">Choose an account</option>
              {choices.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            {choices.length === 0 && (
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {draft.kind === 'deposit' ? 'Add a time deposit account in Wallet first.' : 'No matching account yet. Add one in Wallet.'}
              </span>
            )}
          </label>

          {draft.kind === 'savings' && (
            <>
              <Input label="Yearly rate %" type="number" step="0.01" value={draft.ratePct} onChange={(event) => setDraft({ ...draft, ratePct: Number(event.target.value), preset: 'custom' })} />
              <Input label="Higher rate on the excess %" type="number" step="0.01" value={draft.tierRatePct} onChange={(event) => setDraft({ ...draft, tierRatePct: Number(event.target.value), preset: 'custom' })} />
              <Input label="Excess starts at" type="number" step="0.01" value={draft.tierFromCents / 100} onChange={(event) => setDraft({ ...draft, tierFromCents: pesosToCents(event.target.value), preset: 'custom' })} />
              <Input label="Minimum balance" type="number" step="0.01" value={draft.minBalanceCents / 100} onChange={(event) => setDraft({ ...draft, minBalanceCents: pesosToCents(event.target.value), preset: 'custom' })} />
              <Input label="Tax %" type="number" step="0.01" value={draft.taxPct} onChange={(event) => setDraft({ ...draft, taxPct: Number(event.target.value), preset: 'custom' })} />
              <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                Day count
                <select value={draft.dayCount} onChange={(event) => setDraft({ ...draft, dayCount: Number(event.target.value) === 360 ? 360 : 365 })} className={selectClass}>
                  <option value={365}>365</option>
                  <option value={360}>360</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                Credit
                <select value={draft.creditWhen} onChange={(event) => setDraft({ ...draft, creditWhen: event.target.value === 'month-end' ? 'month-end' : 'daily' })} className={selectClass}>
                  <option value="daily">Every day</option>
                  <option value="month-end">Month-end</option>
                </select>
              </label>
            </>
          )}

          {draft.kind === 'cashback' && (
            <>
              <Input label="Cashback %" type="number" step="0.01" value={draft.cashbackPct} onChange={(event) => setDraft({ ...draft, cashbackPct: Number(event.target.value), preset: 'custom' })} />
              <Input label="Monthly cap" type="number" step="0.01" value={draft.monthlyCapCents / 100} onChange={(event) => setDraft({ ...draft, monthlyCapCents: pesosToCents(event.target.value), preset: 'custom' })} />
            </>
          )}

          {draft.kind === 'loan' && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                Method
                <select
                  value={draft.method}
                  onChange={(event) => setDraft({ ...draft, method: event.target.value === 'revolving' ? 'revolving' : 'addon', preset: 'custom', accountId: 0 })}
                  className={selectClass}
                >
                  <option value="addon">Add-on, interest up front</option>
                  <option value="revolving">Revolving, charged each month</option>
                </select>
              </label>
              <Input label="Monthly rate %" type="number" step="0.01" value={draft.monthlyRatePct} onChange={(event) => setDraft({ ...draft, monthlyRatePct: Number(event.target.value), preset: 'custom' })} />
              {draft.method === 'addon' && (
                <>
                  <Input label="Principal" type="number" step="0.01" value={draft.principalCents / 100} onChange={(event) => setDraft({ ...draft, principalCents: pesosToCents(event.target.value), preset: 'custom' })} />
                  <Input label="Months" type="number" value={draft.tenorMonths} onChange={(event) => setDraft({ ...draft, tenorMonths: Number(event.target.value), preset: 'custom' })} />
                  <Input label="Due day" type="number" value={draft.dueDay} onChange={(event) => setDraft({ ...draft, dueDay: Number(event.target.value), preset: 'custom' })} />
                  <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                    Cashback goes to
                    <select value={draft.payFromAccountId || ''} onChange={(event) => setDraft({ ...draft, payFromAccountId: Number(event.target.value) || undefined })} className={selectClass}>
                      <option value="">Choose an account</option>
                      {wallets.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </label>
                </>
              )}
              {draft.method === 'revolving' && (
                <label className="flex min-h-11 items-center justify-between rounded-2xl bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)]">
                  Paid in full this month
                  <input type="checkbox" checked={draft.paidInFull} onChange={(event) => setDraft({ ...draft, paidInFull: event.target.checked })} className="h-5 w-5" />
                </label>
              )}
            </>
          )}

          {draft.kind === 'deposit' && (
            <>
              <Input label="Yearly rate %" type="number" step="0.01" value={draft.ratePct} onChange={(event) => setDraft({ ...draft, ratePct: Number(event.target.value), preset: 'custom' })} />
              <Input label="Months" type="number" value={draft.tenorMonths} onChange={(event) => setDraft({ ...draft, tenorMonths: Number(event.target.value), preset: 'custom' })} />
              <Input label="Tax %" type="number" step="0.01" value={draft.taxPct} onChange={(event) => setDraft({ ...draft, taxPct: Number(event.target.value), preset: 'custom' })} />
              <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                Credit
                <select value={draft.creditWhen === 'maturity' ? 'maturity' : 'month-end'} onChange={(event) => setDraft({ ...draft, creditWhen: event.target.value === 'maturity' ? 'maturity' : 'month-end' })} className={selectClass}>
                  <option value="month-end">Every month, to another account</option>
                  <option value="maturity">Once, back into the deposit</option>
                </select>
              </label>
              {draft.creditWhen !== 'maturity' && (
                <label className="flex flex-col gap-1.5 text-sm font-bold text-[var(--text-main)]">
                  Interest goes to
                  <select value={draft.payFromAccountId || ''} onChange={(event) => setDraft({ ...draft, payFromAccountId: Number(event.target.value) || undefined })} className={selectClass}>
                    <option value="">Choose an account</option>
                    {wallets.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              )}
            </>
          )}

          <Input label="Starts" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />

          <label className="flex min-h-11 items-center justify-between rounded-2xl bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)]">
            Active
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} className="h-5 w-5" />
          </label>

          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Saving' : 'Save rule'}
          </Button>
          {draft.id && draft.kind === 'loan' && draft.method === 'addon' && !draft.paidEarly && (
            <Button type="button" variant="secondary" onClick={() => void handlePayEarly()} disabled={busy}>
              Record early payoff
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
