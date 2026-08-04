/**
 * financialState.ts
 *
 * High-level financial synchronization service.
 *
 * refreshFinancialState() is the single entry point that must be called
 * after every financial mutation (transactions, transfers, wallet account
 * changes, loans, imports, restores, clear-data, etc.).
 *
 * Responsibilities:
 *  1. Refresh all financial stores in parallel (wallets, loans — extensible)
 *  2. Sync the Android home widget via widgetSync (non-blocking on failure)
 *
 * Architectural rules:
 *  - Store READ methods (fetchAccounts, fetchLoans) remain pure — no side
 *    effects. This function orchestrates them from the outside.
 *  - syncWidget() is always wrapped in try/catch inside widgetSync.ts, so
 *    widget failures never propagate here.
 *  - All mutations MUST await this function before resolving so callers
 *    always receive consistent state.
 *  - Add new store refreshes here (e.g., budgetStore, savingsStore) as the
 *    app grows — never scatter them across call sites.
 */

import { useWalletStore } from '@/store/walletStore';
import { useLoanStore } from '@/store/loanStore';
import { syncWidget } from '@/lib/widgetSync';

export async function refreshFinancialState(): Promise<void> {
    // 1. Refresh all independent financial stores in parallel
    await Promise.all([
        useWalletStore.getState().fetchAccounts(),
        useLoanStore.getState().fetchLoans(),
    ]);

    // 2. Sync widget with freshly updated state.
    //    syncWidget() handles its own try/catch — failure here is silently logged.
    await syncWidget();
}
