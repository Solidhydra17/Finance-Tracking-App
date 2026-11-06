import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { db } from '@/storage/indexeddb/database';
import { useUIStore, useWalletStore } from '@/store';
import { formatCurrency } from '@/lib/money';
import { getCurrentLocalDate } from '@/lib/date';
import type { BankRule, Transaction } from '@/types';
import { previewBankRule } from '@/domain/yield/calculator';

const kindLabel = {
  savings: 'Interest',
  cashback: 'Cashback',
  loan: 'Loan',
  deposit: 'Deposit',
} as const;

export const BankRulesHome: React.FC = () => {
  const accounts = useWalletStore((state) => state.accounts);
  const { currencySymbol, currencyPosition } = useUIStore();
  const [rules, setRules] = useState<BankRule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const today = getCurrentLocalDate();

  useEffect(() => {
    let cancelled = false;
    void Promise.all([db.bankRules.toArray(), db.transactions.toArray()]).then(([nextRules, nextTransactions]) => {
      if (cancelled) return;
      setRules(nextRules);
      setTransactions(nextTransactions);
    });
    return () => {
      cancelled = true;
    };
  }, [accounts]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-midblue dark:text-white">Bank rules</h3>
        <Link to="/bank-rules" className="text-xs font-bold text-midblue">
          {rules.length === 0 ? 'Add' : 'Open'}
        </Link>
      </div>
      {rules.length === 0 ? (
        <Link
          to="/bank-rules"
          className="flex min-h-16 items-center gap-3 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-midblue/10 text-midblue">
            <BuildingLibraryIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-[var(--text-main)]">Interest, cashback, loans, deposits</span>
            <span className="block text-xs text-[var(--text-muted)]">Credits land in activity when they are due</span>
          </span>
        </Link>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.slice(0, 4).map((rule) => {
            const view = previewBankRule(rule, accounts, transactions, today);
            return (
              <li key={rule.id}>
                <Link to="/bank-rules" className="flex items-center gap-3 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-midblue/10 text-sm font-extrabold text-midblue">
                    {kindLabel[rule.kind].slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--text-main)]">{rule.name}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">{view?.summary ?? kindLabel[rule.kind]}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-[var(--text-main)]">
                    {view ? formatCurrency(view.amountCents, currencySymbol, currencyPosition) : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
