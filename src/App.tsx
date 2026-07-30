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
import { useUIStore } from '@/store';

const WIDGET_ACTIVITY_ID = 'kuripot-balance-widget';

export async function updateNativeWidget() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { CapgoWidgetKit } = await import('@capgo/capacitor-widget-kit' as any) as any;
    const [totals] = await Promise.all([walletService.getTotals()]);
    const sym = useUIStore.getState().currencySymbol;
    const fmt = (n: number) => `${sym}${(n / 100).toFixed(2)}`;

    const state = {
      totalBalance: fmt(totals.totalWalletBalance),
    };

    try {
      await CapgoWidgetKit.updateTemplateActivity({
        activityId: WIDGET_ACTIVITY_ID,
        state,
      });
    } catch {
      await CapgoWidgetKit.startTemplateWidget({
        activityId: WIDGET_ACTIVITY_ID,
        definition: {
          id: WIDGET_ACTIVITY_ID,
          layouts: {
            homeScreen: {
              svg: `<svg viewBox="0 0 169 169" xmlns="http://www.w3.org/2000/svg">
                <text x="84" y="84" text-anchor="middle" dominant-baseline="middle"
                  font-family="system-ui" font-size="24" fill="#ffffff">
                  {{state.totalBalance}}
                </text>
              </svg>`,
              width: 169,
              height: 169,
            },
          },
        },
        state,
      });
    }

    await CapgoWidgetKit.reloadWidgets();

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
