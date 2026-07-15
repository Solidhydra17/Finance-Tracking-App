import React, { useState } from 'react';
import { useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Icon, Modal, Input, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { WalletAccount, WalletAccountType } from '@/types';

export const WalletAccountsList: React.FC = () => {
    const { accounts, createAccount, updateAccount, deleteAccount, payCreditCard, createFundTransfer } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        createAccount: state.createAccount,
        updateAccount: state.updateAccount,
        deleteAccount: state.deleteAccount,
        payCreditCard: state.payCreditCard,
        createFundTransfer: state.createFundTransfer
    })));

    const { currencySymbol, currencyPosition, addToast, isTransferOpen, setTransferOpen } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast,
        isTransferOpen: state.isTransferOpen,
        setTransferOpen: state.setTransferOpen
    })));

    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<WalletAccount | null>(null);
    const [accountType, setAccountType] = useState<WalletAccountType>('debit');
    const [name, setName] = useState('');
    const [creditLimit, setCreditLimit] = useState(''); // input as string (dollars)
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    // Pay Card Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payAccount, setPayAccount] = useState<WalletAccount | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [paySourceAccountId, setPaySourceAccountId] = useState<number | ''>('');
    const [payNotes, setPayNotes] = useState('');

    const cashAccount = accounts.find(a => a.type === 'cash');
    const debitAccounts = accounts.filter(a => a.type === 'debit');
    const ecashAccounts = accounts.filter(a => a.type === 'ecash');
    const creditAccounts = accounts.filter(a => a.type === 'credit');
    const nonCreditAccounts = [cashAccount, ...debitAccounts, ...ecashAccounts].filter(Boolean) as WalletAccount[];

    // Fund Transfer Modal State
    const [transferFromId, setTransferFromId] = useState<number | ''>('');
    const [transferToId, setTransferToId] = useState<number | ''>('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [transferNotes, setTransferNotes] = useState('');

    const totalDebitBalance = (cashAccount?.balance || 0) + debitAccounts.reduce((sum, a) => sum + a.balance, 0) + ecashAccounts.reduce((sum, a) => sum + a.balance, 0);

    const openCreateModal = (type: WalletAccountType = 'debit') => {
        setEditingAccount(null);
        setAccountType(type);
        setName('');
        setCreditLimit('');
        setIsManageModalOpen(true);
    };

    const openEditModal = (account: WalletAccount) => {
        setEditingAccount(account);
        setAccountType(account.type);
        setName(account.name);
        setCreditLimit(account.creditLimit ? (account.creditLimit / 100).toString() : '');
        setIsManageModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name && accountType !== 'cash') {
            addToast('error', 'Name is required');
            return;
        }

        const limitCents = creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined;

        try {
            if (editingAccount) {
                await updateAccount(editingAccount.id!, {
                    name: accountType === 'cash' ? 'Cash' : name,
                    creditLimit: accountType === 'credit' ? limitCents : undefined
                });
                addToast('success', 'Account updated');
            } else {
                await createAccount({
                    name: accountType === 'cash' ? 'Cash' : name,
                    type: accountType,
                    creditLimit: accountType === 'credit' ? limitCents : undefined
                });
                addToast('success', 'Account created');
            }
            setIsManageModalOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const handleDelete = async () => {
        if (!editingAccount) return;
        try {
            await deleteAccount(editingAccount.id!);
            addToast('success', 'Account deleted');
            setIsConfirmDeleteOpen(false);
            setIsManageModalOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const openPayModal = (account: WalletAccount) => {
        setPayAccount(account);
        setPayAmount((Math.max(0, account.balance) / 100).toString());
        setPaySourceAccountId(cashAccount ? cashAccount.id! : (debitAccounts[0]?.id || ''));
        setPayNotes('');
        setIsPayModalOpen(true);
    };

    const handlePayCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payAccount || !paySourceAccountId) {
            addToast('error', 'Missing payment fields');
            return;
        }

        const amountCents = Math.round(parseFloat(payAmount || '0') * 100);
        if (amountCents <= 0) {
            addToast('error', 'Payment amount must be greater than zero');
            return;
        }

        try {
            await payCreditCard({
                creditCardAccountId: payAccount.id!,
                sourceWalletAccountId: Number(paySourceAccountId),
                amount: amountCents,
                notes: payNotes,
                date: new Date().toISOString().split('T')[0]
            });
            addToast('success', 'Credit card paid successfully');
            setIsPayModalOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const renderCard = (account: WalletAccount) => {
        const isCredit = account.type === 'credit';
        const limit = account.creditLimit || 1; // avoid division by zero visually
        const usagePercent = isCredit ? (Math.max(0, account.balance) / limit) * 100 : 0;
        const overLimit = usagePercent > 100;

        return (
            <div
                key={account.id}
                onClick={() => openEditModal(account)}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3"
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${account.type === 'cash' ? 'bg-emerald-500/10 text-emerald-500' :
                                account.type === 'debit' ? 'bg-blue-500/10 text-blue-500' :
                                    account.type === 'ecash' ? 'bg-teal-500/10 text-teal-500' :
                                        'bg-purple-500/10 text-purple-500'
                            }`}>
                            <Icon name={
                                account.type === 'cash' ? 'BanknotesIcon' :
                                    account.type === 'debit' ? 'BuildingLibraryIcon' :
                                        account.type === 'ecash' ? 'DevicePhoneMobileIcon' :
                                            'CreditCardIcon'
                            } className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-main)] leading-tight">{account.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{account.type === 'ecash' ? 'E-Cash' : account.type}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-extrabold ${isCredit ? (overLimit ? 'text-red-500' : 'text-purple-500') : account.type === 'ecash' ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--text-main)]'}`}>
                            {formatCurrency(account.balance, currencySymbol, currencyPosition)}
                        </p>
                        {isCredit && account.creditLimit && (
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                                Limit: {formatCurrency(account.creditLimit, currencySymbol, currencyPosition)}
                            </p>
                        )}
                    </div>
                </div>

                {isCredit && account.creditLimit && (
                    <div className="w-full">
                        <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className={overLimit ? 'text-red-500' : 'text-[var(--text-muted)]'}>
                                {usagePercent.toFixed(0)}% Used
                            </span>
                            <span className="text-[var(--text-muted)]">
                                {((account.balance / totalDebitBalance) * 100 || 0).toFixed(0)}% of total funds
                            </span>
                        </div>
                        <div className="h-1.5 bg-[var(--item-bg)] rounded-full overflow-hidden mb-3">
                            <div
                                className={`h-full rounded-full ${overLimit ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); openPayModal(account); }}
                            className="w-full text-xs py-2"
                        >
                            Pay Card
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Cash Section */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Cash</h3>
                    {!cashAccount && (
                        <button onClick={() => openCreateModal('cash')} className="text-xs font-bold text-midblue">
                            + Initialize Cash
                        </button>
                    )}
                </div>
                {cashAccount ? renderCard(cashAccount) : (
                    <div className="text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                        <p className="text-sm text-[var(--text-muted)] font-medium">No cash account setup yet.</p>
                    </div>
                )}
            </section>

            {/* E-Cash Section */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">E-Cash</h3>
                    <button onClick={() => openCreateModal('ecash')} className="text-xs font-bold text-midblue">
                        + Add E-Cash
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ecashAccounts.map(renderCard)}
                    {ecashAccounts.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No e-cash accounts found.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Debit Section */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Debit Accounts</h3>
                    <button onClick={() => openCreateModal('debit')} className="text-xs font-bold text-midblue">
                        + Add Debit
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {debitAccounts.map(renderCard)}
                    {debitAccounts.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No debit accounts found.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Credit Section */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Credit Cards</h3>
                    <button onClick={() => openCreateModal('credit')} className="text-xs font-bold text-midblue">
                        + Add Credit Card
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {creditAccounts.map(renderCard)}
                    {creditAccounts.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No credit cards found.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Manage Account Modal */}
            <Modal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                title={editingAccount ? `Edit ${editingAccount.name}` : `Add ${accountType} account`}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-4 p-4">
                    {accountType !== 'cash' && (
                        <Input
                            label="Account Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                accountType === 'debit' ? "e.g., Main Savings" :
                                    accountType === 'ecash' ? "e.g., GCash, Maya" :
                                        "e.g., BDO Visa"
                            }
                            required
                        />
                    )}

                    {accountType === 'credit' && (
                        <Input
                            label="Credit Limit"
                            type="number"
                            step="0.01"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            placeholder="0.00"
                            required
                            leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                        />
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsManageModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Save
                        </Button>
                    </div>

                    {editingAccount && editingAccount.type !== 'cash' && (
                        <div className="pt-4 border-t border-[var(--card-border)]">
                            <Button type="button" variant="danger" onClick={() => setIsConfirmDeleteOpen(true)} className="w-full">
                                Delete Account
                            </Button>
                        </div>
                    )}
                </form>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                title="Delete Account?"
                size="sm"
                position="center"
            >
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[var(--text-main)] font-medium">
                        Are you sure you want to delete this account? Transactions associated with it will lose their wallet assignment.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsConfirmDeleteOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete} className="flex-1">
                            Confirm Delete
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Pay Card Modal */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title={`Pay ${payAccount?.name || 'Card'}`}
                size="md"
                position="bottom"
            >
                <form onSubmit={handlePayCard} className="space-y-4 p-4 pb-6">
                    <Input
                        label="Payment Amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-[var(--text-muted)] ml-1">
                            Pay From Account
                        </label>
                        <div className="relative">
                            <select
                                value={paySourceAccountId}
                                onChange={(e) => setPaySourceAccountId(Number(e.target.value))}
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

                    <Input
                        label="Notes (Optional)"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="e.g., Final statement payment"
                    />

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 bg-midblue hover:bg-midblue/90 text-white border-none shadow-md shadow-midblue/20">
                            Confirm Payment
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Fund Transfer Modal */}
            <Modal
                isOpen={isTransferOpen}
                onClose={() => setTransferOpen(false)}
                title="Fund Transfer"
                size="md"
                position="bottom"
            >
                <form onSubmit={async (e) => {
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
                        addToast('success', 'Transfer completed');
                        setTransferOpen(false);
                    } catch (error: any) {
                        addToast('error', error.message);
                    }
                }} className="space-y-4 p-4 pb-6">
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
        </div>
    );
};
