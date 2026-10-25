import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui";
import { AppLayout } from "@/components/layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { WalletPage } from "@/pages/WalletPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AddTransactionPage } from "@/pages/AddTransactionPage";
import { AddLoanPage } from "@/pages/AddLoanPage";
import { InsightPage } from "@/pages/InsightPage";
import { PaymentPlannerPage } from "@/pages/PaymentPlannerPage";
import { BudgetPlanningPage } from "@/pages/BudgetPlanningPage";
import { walletService } from '@/domain/wallet/walletService';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { scheduleReminders, schedulePaymentPlans } from '@/lib/notifications';
import { getReminders } from '@/hooks/useReminders';
import { refreshFinancialState } from '@/lib/financialState';
import { ensureFreshInstallDefaults } from '@/storage/indexeddb/database';
import { paymentPlanRepository } from '@/storage';
import { useWalletStore, useLoanStore, useUIStore } from '@/store';
import { refreshWidget } from '@/lib/notificationSettings';

export async function updateNativeWidget(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Force refresh stores from DB so we get current balances
    await useWalletStore.getState().fetchAccounts();
    await useLoanStore.getState().fetchLoans();

    // Read directly from Zustand stores — same values shown in the app
    const { accounts, totalWalletBalance, totalCreditDebt, totalWalletLoanDebt } =
      useWalletStore.getState();
    const { totalOwedToYou, totalYouOwe } =
      useLoanStore.getState();
    const sym = useUIStore.getState().currencySymbol;
    const pos = useUIStore.getState().currencyPosition;

    const fmt = (n: number) => {
      const abs = Math.abs(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const sign = n < 0 ? '-' : '';
      return pos === 'suffix'
        ? `${sign}${abs}${sym}`
        : `${sign}${sym}${abs}`;
    };

    // Match DashboardPage / WalletSummary formula exactly
    // projectedBalance = available wallet funds minus all outstanding debts
    const projectedBalance = totalWalletBalance - totalCreditDebt - totalWalletLoanDebt - totalYouOwe;

    // Build account breakdown grouped by type — matches WalletPage layout
    const cash = accounts.filter(a => a.type === 'cash');
    const ecash = accounts.filter(a => a.type === 'ecash');
    const debit = accounts.filter(a => a.type === 'debit');
    const credit = accounts.filter(a => a.type === 'credit');

    const loan = accounts.filter(a => a.type === 'loan');

    const accountsData = [
      ...cash.map(a => ({ name: a.name, type: 'CASH', balance: fmt(a.balance) })),
      ...ecash.map(a => ({ name: a.name, type: 'E-CASH', balance: fmt(a.balance) })),
      ...debit.map(a => ({ name: a.name, type: 'DEBIT', balance: fmt(a.balance) })),
      ...credit.map(a => ({
        name: a.name,
        type: 'CREDIT',
        balance: fmt(Math.max(0, (a.creditLimit ?? 0) - a.balance)),
      })),
      ...loan.map(a => ({
        name: a.name,
        type: 'LOAN',
        balance: fmt(a.balance), // debt owed on this loan
      })),
    ];

    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'widget_projectedBalance', value: fmt(projectedBalance) });
    await Preferences.set({ key: 'widget_totalBalance', value: fmt(totalWalletBalance) });
    await Preferences.set({ key: 'widget_creditDebt', value: fmt(totalCreditDebt) });
    // Loan Debt = institutional loan account debt + P2P loan debt (kept separate from credit card debt)
    await Preferences.set({ key: 'widget_loanDebt', value: fmt(totalWalletLoanDebt + totalYouOwe) });
    await Preferences.set({ key: 'widget_owedToYou', value: fmt(totalOwedToYou) });
    await Preferences.set({ key: 'widget_youOwe', value: fmt(totalYouOwe) });
    await Preferences.set({ key: 'widget_accounts', value: JSON.stringify(accountsData) });

    await refreshWidget();
  } catch (e) {
    console.warn('[Widget] updateNativeWidget failed:', e);
  }
}

const HardwareBackButtonManager: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const addToast = useUIStore((state) => state.addToast);
    const lastBackPress = React.useRef(0);
    const pathnameRef = React.useRef(location.pathname);

    React.useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    React.useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const listener = CapacitorApp.addListener('backButton', () => {
            const ui = useUIStore.getState();
            if (ui.isPaymentPlanOpen) {
                ui.setPaymentPlanOpen(false);
                return;
            }
            if (ui.isAddMenuOpen) {
                ui.setAddMenuOpen(false);
                return;
            }
            if (ui.isTransferOpen) {
                ui.setTransferOpen(false);
                return;
            }
            if (ui.isAddTransactionOpen) {
                ui.setAddTransactionOpen(false);
                return;
            }
            if (ui.isAddLoanOpen) {
                ui.setAddLoanOpen(false);
                return;
            }
            if (ui.isAddRecurringOpen) {
                ui.setAddRecurringOpen(false);
                return;
            }

            const historyIndex = window.history.state?.idx;
            if (typeof historyIndex === 'number' && historyIndex > 0) {
                navigate(-1);
                return;
            }
            if (pathnameRef.current !== '/') {
                navigate('/', { replace: true });
                return;
            }

            const now = Date.now();
            if (now - lastBackPress.current < 2000) {
                CapacitorApp.exitApp();
            } else {
                lastBackPress.current = now;
                addToast('info', 'Press back again to close', 2000);
            }
        });

        return () => {
            listener.then(l => l.remove());
        };
    }, [navigate, addToast]);

    return null;
};

/** Opens Add Transaction (same form) from the Quick Add home-screen widget. */
const WidgetDeepLinkManager: React.FC = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const go = (path: string) => {
            if (path.startsWith('/')) navigate(path);
        };

        const consumePending = async () => {
            try {
                const { value } = await Preferences.get({ key: 'widget_pending_nav' });
                if (value) {
                    await Preferences.remove({ key: 'widget_pending_nav' });
                    go(value);
                }
            } catch (e) {
                console.warn('[Widget] pending nav failed:', e);
            }
        };

        void consumePending();
        const retry = window.setTimeout(() => { void consumePending(); }, 500);

        const handler = (e: Event) => {
            const path = (e as CustomEvent<string>).detail;
            if (typeof path === 'string') go(path);
        };
        window.addEventListener('kuripot-widget-nav', handler);

        return () => {
            window.clearTimeout(retry);
            window.removeEventListener('kuripot-widget-nav', handler);
        };
    }, [navigate]);

    return null;
};


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

        // Initial financial state sync (stores + widget)
        refreshFinancialState().catch(console.warn);

        // Re-schedule reminders on every app open to refresh the 4-week window
        const reminders = getReminders();
        scheduleReminders(reminders).catch(console.warn);
        paymentPlanRepository.getAll().then(schedulePaymentPlans).catch(console.warn);
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
                    totalBalance: (totals.totalWalletBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    currency: '₱',
                    accounts: accounts.map((a) => ({
                        name: a.name,
                        type: a.type.toUpperCase(),
                        // For credit accounts show available credit; otherwise show balance
                        balance: a.type === 'credit'
                            ? (((a.creditLimit ?? 0) - Math.max(0, a.balance)) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : (a.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
                <HardwareBackButtonManager />
                <WidgetDeepLinkManager />
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
                        <Route path="insight" element={<InsightPage />} />
                        <Route path="payment-planner" element={<PaymentPlannerPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
};
