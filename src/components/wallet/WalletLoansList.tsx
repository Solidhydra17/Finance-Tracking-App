import React, { useState } from 'react';
import { useLoanStore, useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Modal, Input, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import { formatDateLocal } from '@/lib/date';
import type { Loan } from '@/types';

export const WalletLoansList: React.FC = () => {
    const { loans, repayLoan } = useLoanStore(useShallow(state => ({
        loans: state.loans,
        repayLoan: state.repayLoan
    })));

    const { accounts } = useWalletStore(useShallow(state => ({
        accounts: state.accounts
    })));

    const { currencySymbol, currencyPosition, addToast } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast
    })));

    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [walletAccountId, setWalletAccountId] = useState<number | ''>('');

    const openRepayModal = (loan: Loan) => {
        setSelectedLoan(loan);
        setRepayAmount('');
        // Auto-select a default wallet (cash or first debit)
        const defaultWallet = accounts.find(a => a.type === 'cash') || accounts.find(a => a.type === 'debit');
        setWalletAccountId(defaultWallet?.id || '');
        setIsRepayModalOpen(true);
    };

    const handleRepay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan || !walletAccountId) return;
        
        const amountCents = Math.round(parseFloat(repayAmount) * 100);
        if (amountCents <= 0) {
            addToast('error', 'Amount must be greater than 0');
            return;
        }

        try {
            await repayLoan(
                selectedLoan.id!,
                amountCents,
                Number(walletAccountId),
                new Date().toISOString(),
                "Manual Repayment"
            );
            addToast('success', 'Repayment successful');
            setIsRepayModalOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const activeLoans = loans.filter(l => l.status !== 'paid');

    const outboundLoans = activeLoans.filter(l => l.direction === 'outbound');
    const inboundLoans = activeLoans.filter(l => l.direction === 'inbound');

    const renderLoanCard = (loan: Loan) => {
        // Technically, I should calculate exact paid amount from loanPayments but the store 
        // doesn't hold payments array in state currently. We can rough it by assuming status.
        // For accurate display we'd need loan payments joined, but for now we'll just show the total.
        return (
            <div key={loan.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-[var(--text-main)] leading-tight">{loan.personName}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">Due: {formatDateLocal(new Date(loan.dueDate))}</p>
                    </div>
                    <p className={`font-extrabold ${loan.direction === 'outbound' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(loan.amount, currencySymbol, currencyPosition)}
                    </p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[var(--card-border)]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                        {loan.status.replace('_', ' ')}
                    </span>
                    <button 
                        onClick={() => openRepayModal(loan)}
                        className="text-xs font-bold text-white bg-midblue px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Log Repayment
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 mt-6">
            {/* Outbound Loans */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Owed to You (Outbound)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {outboundLoans.map(renderLoanCard)}
                    {outboundLoans.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No active outbound loans.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Inbound Loans */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">You Owe (Inbound)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inboundLoans.map(renderLoanCard)}
                    {inboundLoans.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No active inbound loans.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Repay Modal */}
            <Modal
                isOpen={isRepayModalOpen}
                onClose={() => setIsRepayModalOpen(false)}
                title="Log Repayment"
                size="md"
            >
                <form onSubmit={handleRepay} className="space-y-4 p-4">
                    <Input
                        label="Amount Paid"
                        type="number"
                        step="0.01"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                    />

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest ml-1">
                            {selectedLoan?.direction === 'outbound' ? 'Receive into Wallet' : 'Pay from Wallet'}
                        </label>
                        <select
                            value={walletAccountId}
                            onChange={(e) => setWalletAccountId(Number(e.target.value))}
                            required
                            className="w-full h-12 px-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-main)] font-medium focus:border-midblue focus:ring-0 outline-none transition-colors"
                        >
                            <option value="" disabled>Select Wallet Account</option>
                            {accounts.filter(a => a.type !== 'credit').map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({formatCurrency(account.balance, currencySymbol, currencyPosition)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsRepayModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Confirm Repayment
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
