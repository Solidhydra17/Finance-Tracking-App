import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui";
import { AppLayout } from "@/components/layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { WalletPage } from "@/pages/WalletPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { AddLoanPage } from "@/pages/AddLoanPage";
import { BudgetPlanningPage } from "@/pages/BudgetPlanningPage";
import { walletService } from '@/domain/wallet/walletService';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { scheduleReminders } from '@/lib/notifications';
import { getReminders } from '@/hooks/useReminders';
import { useUIStore, useWalletStore, useLoanStore } from '@/store';
import { ensureFreshInstallDefaults } from '@/storage/indexeddb/database';
import { refreshWidget } from '@/lib/notificationSettings';

export async function updateNativeWidget(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Refresh stores from DB first so we read current values
    // (transaction add/delete does not automatically refresh walletStore)
    await useWalletStore.getState().fetchAccounts();
    await useLoanStore.getState().fetchLoans();

    // Read directly from Zustand stores — now fresh
    const { accounts, totalWalletBalance, totalCreditDebt } =
      useWalletStore.getState();
    const { totalOwedToYou, totalYouOwe } =
      useLoanStore.getState();
    const sym = useUIStore.getState().currencySymbol;
    const pos = useUIStore.getState().currencyPosition;

    const fmt = (n: number) => {
      const abs = Math.abs(n / 100).toFixed(2);
      const sign = n < 0 ? '-' : '';
      return pos === 'suffix'
        ? `${sign}${abs}${sym}`
        : `${sign}${sym}${abs}`;
    };

    // Match DashboardPage formula exactly
    const projectedBalance = totalWalletBalance - totalCreditDebt - totalYouOwe;

    // Build account breakdown grouped by type — matches WalletPage layout
    const cash = accounts.filter(a => a.type === 'cash');
    const ecash = accounts.filter(a => a.type === 'ecash');
    const debit = accounts.filter(a => a.type === 'debit');
    const credit = accounts.filter(a => a.type === 'credit');

    const accountsData = [
      ...cash.map(a => ({ name: a.name, type: 'CASH', balance: fmt(a.balance) })),
      ...ecash.map(a => ({ name: a.name, type: 'E-CASH', balance: fmt(a.balance) })),
      ...debit.map(a => ({ name: a.name, type: 'DEBIT', balance: fmt(a.balance) })),
      ...credit.map(a => ({
        name: a.name,
        type: 'CREDIT',
        balance: fmt(Math.max(0, (a.creditLimit ?? 0) - a.balance)),
      })),
    ];

    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'widget_projectedBalance', value: fmt(projectedBalance) });
    await Preferences.set({ key: 'widget_totalBalance', value: fmt(totalWalletBalance) });
    await Preferences.set({ key: 'widget_creditDebt', value: fmt(totalCreditDebt) });
    await Preferences.set({ key: 'widget_owedToYou', value: fmt(totalOwedToYou) });
    await Preferences.set({ key: 'widget_youOwe', value: fmt(totalYouOwe) });
    await Preferences.set({ key: 'widget_accounts', value: JSON.stringify(accountsData) });

    await refreshWidget();
  } catch (e) {
    console.warn('[Widget] updateNativeWidget failed:', e);
  }
}

export const App: React.FC = () => {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            SplashScreen.hide();
        }

        // Seed defaults on every startup (safe — checks count before inserting)
        ensureFreshInstallDefaults().catch(console.warn);

        const materialize = async () => {
            const { recurringMaterializer } = await import('@/domain/recurring/materializer');
            await recurringMaterializer.materializeDueTransactions();
        };
        materialize();

        updateNativeWidget();

        // Re-schedule reminders on every app open to refresh the 4-week window
        const reminders = getReminders();
        scheduleReminders(reminders).catch(console.warn);
    }, []);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const handleSWMessage = async (event: MessageEvent) => {
            if (event.data?.type !== 'WIDGET_DATA_REQUEST') return;
            const widgetTag = event.data.widgetTag as string;

            try {
                const [accounts, totals] = await Promise.all([
                    walletService.getAllAccounts(),
                    walletService.getTotals(),
                ]);

                // Balances are stored in integer cents — divide by 100 for display
                const widgetData = {
                    totalBalance: (totals.totalWalletBalance / 100).toFixed(2),
                    currency: '₱',
                    accounts: accounts.map((a) => ({
                        name: a.name,
                        type: a.type.toUpperCase(),
                        // For credit accounts show available credit; otherwise show balance
                        balance: a.type === 'credit'
                            ? (((a.creditLimit ?? 0) - Math.max(0, a.balance)) / 100).toFixed(2)
                            : (a.balance / 100).toFixed(2),
                    })),
                };

                // Post the response back to the service worker
                // NOTE: Use navigator.serviceWorker.controller (not event.source)
                // because event.source is null for SW→client messages
                const sw = navigator.serviceWorker.controller;
                if (sw) {
                    sw.postMessage({
                        type: 'WIDGET_DATA_RESPONSE',
                        widgetTag,
                        data: widgetData,
                    });
                }
            } catch (err) {
                console.warn('[Widget] Failed to fetch wallet data for widget:', err);
            }
        };

        navigator.serviceWorker.addEventListener('message', handleSWMessage);
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
    }, []);

    return (
        <ErrorBoundary>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<DashboardPage />} />
                        <Route
                            path="transactions"
                            element={<TransactionsPage />}
                        />
                        <Route path="wallet" element={<WalletPage />} />
                        <Route path="recurring" element={<RecurringPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="add-transaction" element={<AddTransactionPage />} />
                        <Route path="add-loan" element={<AddLoanPage />} />
                        <Route path="budget-planning" element={<BudgetPlanningPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
};
