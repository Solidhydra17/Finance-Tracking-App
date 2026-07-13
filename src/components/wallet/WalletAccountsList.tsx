import React, { useState } from 'react';
import { useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Icon, Modal, Input, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { WalletAccount, WalletAccountType } from '@/types';

export const WalletAccountsList: React.FC = () => {
    const { accounts, createAccount, updateAccount, deleteAccount } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        createAccount: state.createAccount,
        updateAccount: state.updateAccount,
        deleteAccount: state.deleteAccount
    })));

    const { currencySymbol, currencyPosition, addToast } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast
    })));

    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<WalletAccount | null>(null);
    const [accountType, setAccountType] = useState<WalletAccountType>('debit');
    const [name, setName] = useState('');
    const [balance, setBalance] = useState(''); // input as string (dollars)
    const [creditLimit, setCreditLimit] = useState(''); // input as string (dollars)
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    const cashAccount = accounts.find(a => a.type === 'cash');
    const debitAccounts = accounts.filter(a => a.type === 'debit');
    const creditAccounts = accounts.filter(a => a.type === 'credit');

    const totalDebitBalance = (cashAccount?.balance || 0) + debitAccounts.reduce((sum, a) => sum + a.balance, 0);

    const openCreateModal = (type: WalletAccountType = 'debit') => {
        setEditingAccount(null);
        setAccountType(type);
        setName('');
        setBalance('');
        setCreditLimit('');
        setIsManageModalOpen(true);
    };

    const openEditModal = (account: WalletAccount) => {
        setEditingAccount(account);
        setAccountType(account.type);
        setName(account.name);
        setBalance((account.balance / 100).toString());
        setCreditLimit(account.creditLimit ? (account.creditLimit / 100).toString() : '');
        setIsManageModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name && accountType !== 'cash') {
            addToast('error', 'Name is required');
            return;
        }

        const balanceCents = Math.round(parseFloat(balance || '0') * 100);
        const limitCents = creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined;

        try {
            if (editingAccount) {
                await updateAccount(editingAccount.id!, {
                    name: accountType === 'cash' ? 'Cash' : name,
                    balance: balanceCents,
                    creditLimit: accountType === 'credit' ? limitCents : undefined
                });
                addToast('success', 'Account updated');
            } else {
                await createAccount({
                    name: accountType === 'cash' ? 'Cash' : name,
                    type: accountType,
                    balance: balanceCents,
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
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            account.type === 'cash' ? 'bg-emerald-500/10 text-emerald-500' :
                            account.type === 'debit' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-purple-500/10 text-purple-500'
                        }`}>
                            <Icon name={
                                account.type === 'cash' ? 'BanknotesIcon' : 
                                account.type === 'debit' ? 'BuildingLibraryIcon' : 
                                'CreditCardIcon'
                            } className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-main)] leading-tight">{account.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{account.type}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-extrabold ${isCredit ? (overLimit ? 'text-red-500' : 'text-purple-500') : 'text-[var(--text-main)]'}`}>
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
                        <div className="h-1.5 bg-[var(--item-bg)] rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${overLimit ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                        </div>
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
                            placeholder={accountType === 'debit' ? "e.g., Main Savings" : "e.g., BDO Visa"}
                            required
                        />
                    )}
                    
                    <Input
                        label={accountType === 'credit' ? "Current Owed Balance" : "Current Balance"}
                        type="number"
                        step="0.01"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        placeholder="0.00"
                        required
                        leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                    />

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
        </div>
    );
};
