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

        // Sync stored reminders to the service worker on every app startup
        const syncReminders = async () => {
            try {
                const { sendRemindersToSW } = await import('@/lib/notifications');
                const stored = JSON.parse(localStorage.getItem('kuripot_reminders') || '[]');
                await sendRemindersToSW(stored);
            } catch (err) {
                // SW may not be active yet on first load — this is safe to ignore
                console.debug('[App] Could not sync reminders to SW on startup:', err);
            }
        };
        syncReminders();

        // Foreground reminder checker: ensures reminders fire reliably while the app is OPEN
        let lastFiredMinutes = -1;
        const foregroundCheckInterval = setInterval(async () => {
            if (!('Notification' in window) || Notification.permission !== 'granted') return;
            
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();

            // Only fire once per minute to avoid spamming
            if (nowMinutes === lastFiredMinutes) return;

            const stored = JSON.parse(localStorage.getItem('kuripot_reminders') || '[]');
            const dayOfWeek = now.getDay();
            let firedAny = false;

            for (const r of stored) {
                if (!r.enabled || !r.days.includes(dayOfWeek)) continue;
                
                const [hh, mm] = r.time.split(':').map(Number);
                const dueMinutes = hh * 60 + mm;
                
                if (nowMinutes === dueMinutes) {
                    try {
                        const reg = await navigator.serviceWorker.ready;
                        reg.showNotification('KURIPOT Reminder', {
                            body: r.label?.trim() || 'Time to log your finances!',
                            icon: '/logo192.png',
                            badge: '/logo192.png',
                            tag: `reminder-${r.id}`,
                            data: { url: '/' },
                            renotify: true
                        } as NotificationOptions);
                        firedAny = true;
                    } catch (e) {
                        console.error('[Foreground Check] Failed to show notification', e);
                    }
                }
            }

            if (firedAny) {
                lastFiredMinutes = nowMinutes;
            }
        }, 15000); // Check every 15 seconds

        return () => clearInterval(foregroundCheckInterval);
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
