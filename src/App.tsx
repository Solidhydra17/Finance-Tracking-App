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

export const App: React.FC = () => {
    useEffect(() => {
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
