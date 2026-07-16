import React, { useState, useEffect } from 'react';
import { useWalletStore, useUIStore, useTransactionStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Modal, Input, Button, Icon } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { WalletAccount } from '@/types';

export const FundTransferModal: React.FC = () => {
    const { accounts, createFundTransfer, fetchAccounts } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        createFundTransfer: state.createFundTransfer,
        fetchAccounts: state.fetchAccounts
    })));

    const invalidateCache = useTransactionStore(state => state.invalidateCache);

    const { currencySymbol, currencyPosition, addToast, isTransferOpen, setTransferOpen } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast,
        isTransferOpen: state.isTransferOpen,
        setTransferOpen: state.setTransferOpen
    })));

    const [transferFromId, setTransferFromId] = useState<number | ''>('');
    const [transferToId, setTransferToId] = useState<number | ''>('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [transferNotes, setTransferNotes] = useState('');

    const cashAccount = accounts.find(a => a.type === 'cash');
    const debitAccounts = accounts.filter(a => a.type === 'debit');
    const ecashAccounts = accounts.filter(a => a.type === 'ecash');
    const nonCreditAccounts = [cashAccount, ...debitAccounts, ...ecashAccounts].filter(Boolean) as WalletAccount[];

    // Reset form states when modal is opened
    useEffect(() => {
        if (isTransferOpen) {
            setTransferFromId('');
            setTransferToId('');
            setTransferAmount('');
            setTransferDate(new Date().toISOString().split('T')[0]);
            setTransferNotes('');
        }
    }, [isTransferOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferFromId || !transferToId) {
            addToast('error', 'Select both accounts');
            return;
        }
        if (transferFromId === transferToId) {
            addToast('error', 'Source and destination must be different');
            return;
        }
        const amountCents = Math.round(parseFloat(transferAmount || '0') * 100);
        if (amountCents <= 0) {
            addToast('error', 'Amount must be greater than zero');
            return;
        }
        try {
            await createFundTransfer({
                sourceAccountId: Number(transferFromId),
                destinationAccountId: Number(transferToId),
                amount: amountCents,
                date: transferDate,
                notes: transferNotes
            });
            await fetchAccounts();
            invalidateCache(); // Force TransactionsPage to refetch
            addToast('success', 'Transfer completed');
            setTransferOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    return (
        <Modal
            isOpen={isTransferOpen}
            onClose={() => setTransferOpen(false)}
            title="Fund Transfer"
            size="md"
            position="bottom"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-4 pb-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-muted)] ml-1">From Account</label>
                    <div className="relative">
                        <select
                            value={transferFromId}
                            onChange={(e) => setTransferFromId(Number(e.target.value))}
                            required
                            className="w-full h-[56px] px-4 appearance-none rounded-2xl border-2 border-transparent bg-[var(--item-bg)] text-lg font-bold text-[var(--text-main)] hover:border-midblue/20 focus:border-midblue outline-none transition-all cursor-pointer"
                        >
                            <option value="" disabled>Select Source...</option>
                            {nonCreditAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatCurrency(acc.balance, currencySymbol, currencyPosition)})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Icon name="ChevronUpDownIcon" className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-muted)] ml-1">To Account</label>
                    <div className="relative">
                        <select
                            value={transferToId}
                            onChange={(e) => setTransferToId(Number(e.target.value))}
                            required
                            className="w-full h-[56px] px-4 appearance-none rounded-2xl border-2 border-transparent bg-[var(--item-bg)] text-lg font-bold text-[var(--text-main)] hover:border-midblue/20 focus:border-midblue outline-none transition-all cursor-pointer"
                        >
                            <option value="" disabled>Select Destination...</option>
                            {nonCreditAccounts.filter(acc => acc.id !== transferFromId).map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatCurrency(acc.balance, currencySymbol, currencyPosition)})
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Icon name="ChevronUpDownIcon" className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                    </div>
                </div>

                <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                />

                <Input
                    label="Date"
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                />

                <Input
                    label="Notes (Optional)"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g., Moving to savings"
                />

                <div className="pt-4 flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => setTransferOpen(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1 bg-midblue hover:bg-midblue/90 text-white border-none shadow-md shadow-midblue/20">
                        Transfer
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
