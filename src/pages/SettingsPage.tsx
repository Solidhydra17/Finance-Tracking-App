import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardBody, Button, Modal, Icon } from '@/components/ui';
import { useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { exportAllData, clearAllData, importData, db } from '@/storage';
import { categoryRepository } from '@/storage';
import { RecurringSettings } from '@/components/settings/RecurringSettings';
import { CustomCategorySettings } from '@/components/settings/CustomCategorySettings';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore, useBudgetStore, useWalletStore, useLoanStore } from '@/store';

export const SettingsPage: React.FC = () => {
  const {
    useMockData,
    setUseMockData,
    devOptionsVisible,
    setDevOptionsVisible,
    darkMode,
    setDarkMode,
    creditWarningThreshold,
    setCreditWarningThreshold,
    addToast
  } = useUIStore(useShallow(state => ({
    useMockData: state.useMockData,
    setUseMockData: state.setUseMockData,
    devOptionsVisible: state.devOptionsVisible,
    setDevOptionsVisible: state.setDevOptionsVisible,
    darkMode: state.darkMode,
    setDarkMode: state.setDarkMode,
    creditWarningThreshold: state.creditWarningThreshold,
    setCreditWarningThreshold: state.setCreditWarningThreshold,
    addToast: state.addToast
  })));
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const resetTimer = useRef<any>(null);
  const [devCountdown, setDevCountdown] = useState<number | null>(null);

  const resetAllStores = () => {
    useTransactionStore.setState({
      transactions: [],
      isLoading: false,
      totalTransactions: 0,
      currentPage: 1,
      lastFilters: null
    });
    useBudgetStore.setState({
      plan: null,
      items: [],
      isLoading: false
    });
    useWalletStore.setState({
      accounts: [],
      totalWalletBalance: 0,
      totalCreditDebt: 0,
      isLoading: false,
      error: null
    });
    useLoanStore.setState({
      loans: [],
      totalOwedToYou: 0,
      totalYouOwe: 0,
      isLoading: false,
      error: null
    });
    useUIStore.setState({
      isAddTransactionOpen: false,
      isAddLoanOpen: false,
      isAddRecurringOpen: false,
      isAddMenuOpen: false,
      isTransferOpen: false,
      isLoading: false,
      isFirstLoad: true,
      cachedDashboardData: null
    });
    useUIStore.getState().resetFilters();
  };

  const handleAboutTap = useCallback(() => {
    const now = Date.now();

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    if (now - lastTapTime.current > 2000) {
      tapCount.current = 0;
    }

    tapCount.current += 1;
    lastTapTime.current = now;

    if (tapCount.current === 7) {
      const nextVisible = !devOptionsVisible;
      setDevOptionsVisible(nextVisible);
      addToast('success', nextVisible ? 'Developer options enabled' : 'Developer options hidden');
      tapCount.current = 0;
      setDevCountdown(null);
    } else {
      const remaining = 7 - tapCount.current;
      setDevCountdown(remaining);

      resetTimer.current = setTimeout(() => {
        tapCount.current = 0;
        setDevCountdown(null);
      }, 2000);
    }
  }, [devOptionsVisible, setDevOptionsVisible, addToast]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      addToast('error', 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }, [addToast]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const transactions = await db.transactions.filter(t => !t.deletedAt).toArray();
      const categories = await categoryRepository.getAll();
      const headers = ['Date', 'Type', 'Amount', 'Category', 'Note', 'Source'];
      const rows = transactions.map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return [
          t.date,
          t.type,
          (t.amount / 100).toFixed(2),
          category?.name || 'Unknown',
          `"${(t.note || '').replace(/"/g, '""')}"`,
          t.source,
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'CSV exported successfully');
    } catch (error) {
      console.error('CSV export failed:', error);
      addToast('error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [addToast]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importData(data);
        resetAllStores();
        addToast('success', 'Data imported successfully');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (error) {
        console.error('Import failed:', error);
        addToast('error', 'Failed to import data');
        setIsImporting(false);
      }
    };
    input.click();
  }, [addToast, navigate]);

  const handleClearData = useCallback(async () => {
    setIsConfirmClearOpen(true);
  }, []);

  const confirmClearData = useCallback(async () => {
    setIsConfirmClearOpen(false);

    setIsClearing(true);
    try {
      await clearAllData();
      resetAllStores();
      addToast('success', 'All data cleared');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Clear failed:', error);
      addToast('error', 'Failed to clear data');
      setIsClearing(false);
    }
  }, [addToast, navigate]);

  return (
    <div id="page-settings" className="px-4 space-y-6 pb-20">
      <header className="pt-4">
        <h1 className="text-3xl font-extrabold text-midblue tracking-wider dark:text-white">KURIPOT</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Settings & Preferences</p>
      </header>

      {/* Preferences */}
      <Card id="card-preferences">
        <CardBody className="space-y-4">
          <h3 className="font-bold text-midblue uppercase text-xs tracking-widest">Preferences</h3>

          <div className="flex flex-col gap-3">
            {/* Demo Mode Toggle */}
            {devOptionsVisible && (
              <div className="flex items-center justify-between p-4 bg-[var(--item-bg)] dark:bg-gray-800/50 rounded-2xl border border-[var(--card-border)]">
                <div className="space-y-1">
                  <p className="font-bold text-[var(--text-main)]">Demo Mode (Mock Data)</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium leading-tight max-w-[200px]">
                    When enabled, the app will clear and randomize data on every first load of a session.
                  </p>
                </div>
                <button
                  id="toggle-mock-data"
                  onClick={() => {
                    const newValue = !useMockData;
                    setUseMockData(newValue);
                    addToast('success', `Demo mode ${newValue ? 'enabled' : 'disabled'}`);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${useMockData ? 'bg-midblue' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform shadow-sm ${useMockData ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-[var(--item-bg)] dark:bg-gray-800/50 rounded-2xl border border-[var(--card-border)]">
              <div className="space-y-1">
                <p className="font-bold text-[var(--text-main)]">Dark Mode</p>
                <p className="text-[10px] text-[var(--text-muted)] font-medium leading-tight max-w-[200px]">
                  Switch between light and dark themes for better night viewing.
                </p>
              </div>
              <button
                id="toggle-dark-mode"
                onClick={() => {
                  setDarkMode(!darkMode);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${darkMode ? 'bg-midblue' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform shadow-sm ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Credit Card Warning Threshold */}
            <div className="flex flex-col gap-2 p-4 bg-[var(--item-bg)] dark:bg-gray-800/50 rounded-2xl border border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold text-[var(--text-main)]">Credit Warning Threshold</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium leading-tight">
                    Alert when total credit card debt exceeds this % of debit balance.
                  </p>
                </div>
                <span className="font-bold text-midblue dark:text-white bg-midblue/10 px-2 py-1 rounded-md text-xs">
                  {creditWarningThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={creditWarningThreshold}
                onChange={(e) => setCreditWarningThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-midblue mt-2"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <RecurringSettings />
      <CustomCategorySettings />

      {/* Data Management */}
      <Card id="card-data-management">
        <CardBody className="space-y-4">
          <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Data Management</h3>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={handleExportJSON}
              isLoading={isExporting}
              className="w-full"
            >
              📥 Export All Data (JSON)
            </Button>

            <Button
              variant="secondary"
              onClick={handleExportCSV}
              isLoading={isExporting}
              className="w-full"
            >
              📊 Export Transactions (CSV)
            </Button>

            <Button
              variant="secondary"
              onClick={handleImport}
              isLoading={isImporting}
              className="w-full"
            >
              📤 Import Data (JSON)
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Danger Zone */}
      <Card id="card-danger-zone">
        <CardBody className="space-y-4">
          <h3 className="font-bold text-danger-600 dark:text-danger-400 uppercase text-xs tracking-widest">Danger Zone</h3>
          <p className="text-sm text-[var(--text-muted)] font-medium">
            Deleting all data will permanently remove all your transactions,
            loans, and recurring rules. <span className="font-bold text-midblue dark:text-white">Your categories will be kept.</span>
          </p>
          <Button
            variant="danger"
            onClick={handleClearData}
            isLoading={isClearing}
            className="w-full"
          >
            🗑️ Delete All Data
          </Button>
        </CardBody>
      </Card>

      {/* App Info */}
      <Card id="card-about" onClick={handleAboutTap}>
        <CardBody>
          <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest mb-3">About</h3>
          <p className="text-sm text-[var(--text-main)] font-bold">
            Finance Tracker v1.0.1
          </p>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
            Offline-first personal finance management
          </p>
        </CardBody>
      </Card>

      {/* Dev options tap feedback toast */}
      {devCountdown !== null && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-opacity duration-300">
          {devCountdown} {devCountdown === 1 ? 'more tap' : 'more taps'}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        title="Wipe All Data?"
        size="sm"
        position="bottom"
      >
        <div id="modal-confirm-clear-content" className="space-y-6 pt-2 pb-6">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="w-16 h-16 bg-danger-500/10 rounded-full flex items-center justify-center">
              <Icon name="ExclamationTriangleIcon" className="w-8 h-8 text-danger-500" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-main)] text-lg">Are you absolutely sure?</p>
              <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed">
                This will permanently delete all transactions, loans, and recurring rules.
                <span className="text-danger-500 font-black block mt-2 uppercase tracking-tighter">This cannot be undone!</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-2">
            <button
              onClick={() => setIsConfirmClearOpen(false)}
              className="flex-1 py-4 rounded-2xl bg-[var(--item-bg)] text-[var(--text-main)] font-bold hover:bg-[var(--card-border)] border border-[var(--card-border)] transition-colors"
            >
              No, keep data
            </button>
            <button
              onClick={confirmClearData}
              className="flex-1 py-4 rounded-2xl bg-danger-500 text-white font-bold hover:bg-danger-600 shadow-xl shadow-danger-500/20 transition-colors"
            >
              Yes, wipe it
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
