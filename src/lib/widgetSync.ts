/**
 * widgetSync.ts
 *
 * Responsible solely for reading the current Zustand financial state and
 * pushing it to the Android home widget via the Capacitor Preferences bridge
 * and the NotificationSettings native plugin.
 *
 * IMPORTANT: This module must only be called AFTER store state has already
 * been refreshed (i.e., after refreshFinancialState() has resolved).
 * It never triggers store refreshes itself.
 */

import { Capacitor } from '@capacitor/core';
import { useWalletStore } from '@/store/walletStore';
import { useLoanStore } from '@/store/loanStore';
import { useUIStore } from '@/store/uiStore';
import { refreshWidget } from '@/lib/notificationSettings';
import { calculateBalances } from '@/lib/balances';

function fmt(n: number, sym: string, pos: 'prefix' | 'suffix'): string {
    const abs = Math.abs(n / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const sign = n < 0 ? '-' : '';
    return pos === 'suffix' ? `${sign}${abs}${sym}` : `${sign}${sym}${abs}`;
}

/**
 * Reads from already-refreshed Zustand state, builds the widget payload,
 * and requests a native widget redraw.
 *
 * Wrapped in try/catch: widget failures are non-fatal and must never
 * propagate to the caller or block any app state update.
 */
export async function syncWidget(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const { accounts, totalWalletBalance, totalCreditDebt, walletLoanDebt } = useWalletStore.getState();
        const { totalOwedToYou, totalYouOwe } = useLoanStore.getState();
        const { currencySymbol, currencyPosition } = useUIStore.getState();

        const f = (n: number) => fmt(n, currencySymbol, currencyPosition);

        // Ensure Widget matches Dashboard and Wallet exactly
        const { netWorth, projectedBalance, creditDebt, loanDebt } = calculateBalances({
            totalWalletBalance,
            totalCreditDebt,
            walletLoanDebt,
            peerLoanDebt: totalYouOwe,
            totalOwedToYou,
        });

        // Build per-account payload grouped by type (matches WalletPage layout)
        const cash   = accounts.filter(a => a.type === 'cash');
        const ecash  = accounts.filter(a => a.type === 'ecash');
        const debit  = accounts.filter(a => a.type === 'debit');
        const credit = accounts.filter(a => a.type === 'credit');
        const loan   = accounts.filter(a => a.type === 'loan');

        const accountsData = [
            ...cash.map(a   => ({ name: a.name, type: 'CASH',   balance: f(a.balance) })),
            ...ecash.map(a  => ({ name: a.name, type: 'E-CASH', balance: f(a.balance) })),
            ...debit.map(a  => ({ name: a.name, type: 'DEBIT',  balance: f(a.balance) })),
            // Credit: show outstanding debt (same value the Wallet screen shows)
            ...credit.map(a => ({ name: a.name, type: 'CREDIT', balance: f(a.balance) })),
            // Loan: show outstanding debt
            ...loan.map(a   => ({ name: a.name, type: 'LOAN',   balance: f(a.balance) })),
        ];

        const { Preferences } = await import('@capacitor/preferences');
        await Promise.all([
            Preferences.set({ key: 'widget_projectedBalance', value: f(projectedBalance) }),
            Preferences.set({ key: 'widget_totalBalance',     value: f(netWorth) }),
            Preferences.set({ key: 'widget_creditDebt',       value: f(creditDebt) }),
            Preferences.set({ key: 'widget_owedToYou',        value: f(totalOwedToYou) }),
            Preferences.set({ key: 'widget_youOwe',           value: f(loanDebt) }),
            Preferences.set({ key: 'widget_accounts',         value: JSON.stringify(accountsData) }),
        ]);

        await refreshWidget();
    } catch (e) {
        // Widget failures are non-fatal — log only, never re-throw
        console.warn('[widgetSync] syncWidget failed:', e);
    }
}
