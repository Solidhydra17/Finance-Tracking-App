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
import { CapgoWidgetKit } from '@capgo/capacitor-widget-kit';
import { useUIStore } from '@/store';

export async function updateNativeWidget() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [totals] = await Promise.all([walletService.getTotals()]);
    const sym = useUIStore.getState().currencySymbol;
    const fmt = (n: number) => `${sym}${(n / 100).toFixed(2)}`;

    await CapgoWidgetKit.setItem({
      group: 'KuripotWidgetData',
      key: 'totalBalance',
      value: fmt(totals.totalWalletBalance),
    });
    // Add income and expense since the widget expects it, even though the user didn't explicitly include it in the snippet, it's a good idea if totals has it.
    // Actually, I'll just follow the user's snippet exactly as requested to be safe.
    await CapgoWidgetKit.reloadWidget();
  } catch (e) {
    console.warn('[Widget] Failed to update native widget:', e);
  }
}

export const App: React.FC = () => {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            SplashScreen.hide();
        }
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
