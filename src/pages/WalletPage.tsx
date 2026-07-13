import React, { useEffect } from 'react';
import { WalletSummary } from '@/components/wallet/WalletSummary';
import { WalletAccountsList } from '@/components/wallet/WalletAccountsList';
import { WalletLoansList } from '@/components/wallet/WalletLoansList';
import { useWalletStore, useLoanStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';

export const WalletPage: React.FC = () => {
    const { fetchAccounts, isLoading: isWalletLoading } = useWalletStore(useShallow(state => ({
        fetchAccounts: state.fetchAccounts,
        isLoading: state.isLoading
    })));

    const { fetchLoans, isLoading: isLoansLoading } = useLoanStore(useShallow(state => ({
        fetchLoans: state.fetchLoans,
        isLoading: state.isLoading
    })));

    useEffect(() => {
        fetchAccounts();
        fetchLoans();
    }, [fetchAccounts, fetchLoans]);

    const isLoading = isWalletLoading || isLoansLoading;

    return (
        <div id="page-wallet" className="px-4 space-y-6 pb-24 pt-4 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-midblue tracking-wider dark:text-white">WALLET</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Accounts & Loans</p>
                </div>
            </header>

            {isLoading ? (
                <div className="animate-pulse space-y-6">
                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full" />
                </div>
            ) : (
                <>
                    <WalletSummary />
                    <WalletAccountsList />
                    <WalletLoansList />
                </>
            )}
        </div>
    );
};
