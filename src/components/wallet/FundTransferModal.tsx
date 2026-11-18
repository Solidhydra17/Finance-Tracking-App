import React, { useState, useEffect } from 'react';
import { useWalletStore, useUIStore, useTransactionStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Modal, Input, CalcInput, Button, ChoicePopover } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import { getCurrentLocalDate, getCurrentLocalTime } from '@/lib/date';
import type { WalletAccount } from '@/types';

export const FundTransferModal: React.FC = () => {
    const { accounts, createFundTransfer } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        createFundTransfer: state.createFundTransfer,
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
    const [transferDate, setTransferDate] = useState(getCurrentLocalDate());
    const [transferTime, setTransferTime] = useState(getCurrentLocalTime());
    const [transferNotes, setTransferNotes] = useState('');

    const cashAccount = accounts.find(a => a.type === 'cash');
    const debitAccounts = accounts.filter(a => a.type === 'debit');
    const ecashAccounts = accounts.filter(a => a.type === 'ecash');
    const depositAccounts = accounts.filter(a => a.type === 'deposit');
    const nonCreditAccounts = [cashAccount, ...debitAccounts, ...ecashAccounts, ...depositAccounts].filter(Boolean) as WalletAccount[];

    // Reset form states when modal is opened
    useEffect(() => {
        if (isTransferOpen) {
            setTransferFromId('');
            setTransferToId('');
            setTransferAmount('');
            setTransferDate(getCurrentLocalDate());
            setTransferTime(getCurrentLocalTime());
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
                time: transferTime,
                notes: transferNotes
            });
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
                    <ChoicePopover
                        value={transferFromId === '' ? '' : String(transferFromId)}
                        placeholder="Select Source..."
                        options={nonCreditAccounts.map((acc) => ({
                            value: String(acc.id),
                            label: `${acc.name} (${formatCurrency(acc.balance, currencySymbol, currencyPosition)})`,
                        }))}
                        onChange={(next) => {
                            const id = Number(next);
                            setTransferFromId(id);
                            if (transferToId === id) setTransferToId('');
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-muted)] ml-1">To Account</label>
                    <ChoicePopover
                        value={transferToId === '' ? '' : String(transferToId)}
                        placeholder="Select Destination..."
                        options={nonCreditAccounts.filter((acc) => acc.id !== transferFromId).map((acc) => ({
                            value: String(acc.id),
                            label: `${acc.name} (${formatCurrency(acc.balance, currencySymbol, currencyPosition)})`,
                        }))}
                        onChange={(next) => setTransferToId(Number(next))}
                    />
                </div>

                <CalcInput
                    label="Amount"
                    value={transferAmount}
                    onChange={setTransferAmount}
                    currencySymbol={currencySymbol}
                    placeholder="0.00"
                    required
                />

                <div className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            label="Date"
                            type="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <Input
                            label="Time"
                            type="time"
                            value={transferTime}
                            onChange={(e) => setTransferTime(e.target.value)}
                            required
                        />
                    </div>
                </div>

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
