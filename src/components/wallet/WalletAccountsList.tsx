import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListBulletIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Icon, Modal, Input, Button } from '@/components/ui';
import { WalletCardDeck } from '@/components/wallet/WalletCardDeck';
import { formatCurrency } from '@/lib/money';
import { getCurrentLocalDate, getCurrentLocalTime } from '@/lib/date';
import type { WalletAccount, WalletAccountType } from '@/types';
import { db } from '@/storage/indexeddb/database';
import { refreshFinancialState } from '@/lib/financialState';
import { offerUndo } from '@/lib/undo';

export const WalletAccountsList: React.FC = () => {
    const navigate = useNavigate();
    const { accounts, createAccount, updateAccount, saveUsedAmount, deleteAccount, payCreditCard } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        createAccount: state.createAccount,
        updateAccount: state.updateAccount,
        saveUsedAmount: state.setUsedAmount,
        deleteAccount: state.deleteAccount,
        payCreditCard: state.payCreditCard
    })));

    const { currencySymbol, currencyPosition, addToast, balancesHidden, devOptionsVisible } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast,
        balancesHidden: state.balancesHidden,
        devOptionsVisible: state.devOptionsVisible,
    })));

    const [walletListView, setWalletListView] = useState(() => localStorage.getItem('walletListView') === 'true');
    const [walletPhase, setWalletPhase] = useState<'idle' | 'out' | 'in'>('idle');
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<WalletAccount | null>(null);
    const [accountType, setAccountType] = useState<WalletAccountType>('debit');
    const [name, setName] = useState('');
    const [creditLimit, setCreditLimit] = useState(''); // input as string (dollars)
    const [usedAmount, setUsedAmount] = useState('');
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    // Pay Card Modal State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payAccount, setPayAccount] = useState<WalletAccount | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [paySourceAccountId, setPaySourceAccountId] = useState<number | ''>('');
    const [payDate, setPayDate] = useState(getCurrentLocalDate());
    const [payTime, setPayTime] = useState(getCurrentLocalTime());
    const [payNotes, setPayNotes] = useState('');

    const cashAccount = accounts.find(a => a.type === 'cash');
    const debitAccounts = accounts.filter(a => a.type === 'debit');
    const ecashAccounts = accounts.filter(a => a.type === 'ecash');
    const creditAccounts = accounts.filter(a => a.type === 'credit');
    const loanAccounts = accounts.filter(a => a.type === 'loan');
    const depositAccounts = accounts.filter(a => a.type === 'deposit');
    const nonCreditAccounts = [cashAccount, ...debitAccounts, ...ecashAccounts].filter(Boolean) as WalletAccount[];
    const paySourceAccounts = [...nonCreditAccounts, ...depositAccounts];

    const totalDebitBalance = (cashAccount?.balance || 0) + debitAccounts.reduce((sum, a) => sum + a.balance, 0) + ecashAccounts.reduce((sum, a) => sum + a.balance, 0);

    const openCreateModal = (type: WalletAccountType = 'debit') => {
        setEditingAccount(null);
        setAccountType(type);
        setName('');
        setCreditLimit('');
        setUsedAmount('');
        setIsManageModalOpen(true);
    };

    const openEditModal = (account: WalletAccount) => {
        setEditingAccount(account);
        setAccountType(account.type);
        setName(account.name);
        setCreditLimit(account.creditLimit ? (account.creditLimit / 100).toString() : '');
        setUsedAmount((account.balance / 100).toString());
        setIsManageModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name && accountType !== 'cash') {
            addToast('error', 'Name is required');
            return;
        }

        const limitCents = creditLimit ? Math.round(parseFloat(creditLimit) * 100) : undefined;
        const canEditUsed = devOptionsVisible && (accountType === 'credit' || accountType === 'loan');
        let usedCents: number | undefined;
        if (canEditUsed && usedAmount.trim()) {
            const amount = Number(usedAmount);
            if (!Number.isFinite(amount) || amount < 0) {
                addToast('error', 'Amount used must be zero or more');
                return;
            }
            usedCents = Math.round(amount * 100);
        } else if (canEditUsed && editingAccount) {
            addToast('error', 'Amount used is required');
            return;
        }

        try {
            if (editingAccount) {
                await updateAccount(editingAccount.id!, {
                    name: accountType === 'cash' ? 'Cash' : name,
                    creditLimit: (accountType === 'credit' || accountType === 'loan') ? limitCents : undefined
                });
                if (canEditUsed && usedCents !== undefined) {
                    await saveUsedAmount(editingAccount.id!, usedCents);
                }
                addToast('success', 'Account updated');
            } else {
                await createAccount({
                    name: accountType === 'cash' ? 'Cash' : name,
                    type: accountType,
                    creditLimit: (accountType === 'credit' || accountType === 'loan') ? limitCents : undefined,
                    ...(usedCents !== undefined ? { balanceAdjustment: usedCents } : {}),
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
            const snapshot = { ...editingAccount };
            await deleteAccount(snapshot.id!);
            setIsConfirmDeleteOpen(false);
            setIsManageModalOpen(false);
            offerUndo('Account deleted', async () => {
              await db.walletAccounts.add(snapshot);
              await refreshFinancialState();
            });
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const openPayModal = (account: WalletAccount) => {
        setPayAccount(account);
        setPayAmount((Math.max(0, account.balance) / 100).toString());
        setPaySourceAccountId(cashAccount ? cashAccount.id! : (debitAccounts[0]?.id || ''));
        setPayDate(getCurrentLocalDate());
        setPayTime(getCurrentLocalTime());
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
                date: payDate,
                time: payTime
            });
            addToast('success', 'Credit card paid successfully');
            setIsPayModalOpen(false);
        } catch (error: any) {
            addToast('error', error.message);
        }
    };

    const renderCard = (account: WalletAccount) => {
        const isCredit = account.type === 'credit' || account.type === 'loan';
        const limit = account.creditLimit || 1; // avoid division by zero visually
        const usagePercent = isCredit ? (Math.max(0, account.balance) / limit) * 100 : 0;
        const overLimit = usagePercent > 100;

        return (
            <div
                key={account.id}
                onClick={account.type !== 'cash' ? () => openEditModal(account) : undefined}
                className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm transition-shadow flex flex-col gap-3 ${
                    account.type !== 'cash' ? 'hover:shadow-md cursor-pointer' : ''
                }`}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${account.type === 'cash' ? 'bg-emerald-500/10 text-emerald-500' :
                                account.type === 'debit' ? 'bg-blue-500/10 text-blue-500' :
                                    account.type === 'ecash' ? 'bg-teal-500/10 text-teal-500' :
                                        account.type === 'loan' ? 'bg-rose-500/10 text-rose-500' :
                                            account.type === 'deposit' ? 'bg-amber-500/10 text-amber-600' :
                                            'bg-purple-500/10 text-purple-500'
                            }`}>
                            <Icon name={
                                account.type === 'cash' ? 'BanknotesIcon' :
                                    account.type === 'debit' ? 'BuildingLibraryIcon' :
                                        account.type === 'ecash' ? 'DevicePhoneMobileIcon' :
                                            account.type === 'loan' ? 'DocumentTextIcon' :
                                                account.type === 'deposit' ? 'BuildingLibraryIcon' :
                                                'CreditCardIcon'
                            } className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-[var(--text-main)] leading-tight">{account.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                                {account.type === 'ecash' ? 'E-Cash' : account.type === 'deposit' ? 'Time deposit' : account.type === 'loan' ? 'Principal plus interest' : account.type}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-extrabold ${isCredit ? (overLimit ? 'text-red-500' : (account.type === 'loan' ? 'text-rose-500' : 'text-purple-500')) : account.type === 'ecash' ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--text-main)]'}`}>
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
                                className={`h-full rounded-full ${overLimit ? 'bg-red-500' : (account.type === 'loan' ? 'bg-rose-500' : 'bg-purple-500')}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); openPayModal(account); }}
                            className="w-full text-xs py-2"
                        >
                            {account.type === 'loan' ? 'Pay Loan' : 'Pay Card'}
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    const handleWalletView = () => {
        if (walletPhase !== 'idle') return;
        setWalletPhase('out');
    };

    useEffect(() => {
        if (walletPhase === 'idle') return;
        if (walletPhase === 'out') {
            const id = window.setTimeout(() => {
                setWalletListView((current) => {
                    const next = !current;
                    localStorage.setItem('walletListView', String(next));
                    return next;
                });
                setWalletPhase('in');
            }, 200);
            return () => window.clearTimeout(id);
        }
        let second = 0;
        const first = window.requestAnimationFrame(() => {
            second = window.requestAnimationFrame(() => setWalletPhase('idle'));
        });
        return () => {
            window.cancelAnimationFrame(first);
            window.cancelAnimationFrame(second);
        };
    }, [walletPhase]);

    const walletTypeLabel = (type: WalletAccount['type']) => {
        if (type === 'ecash') return 'E-Cash';
        if (type === 'debit') return 'Debit';
        return 'Cash';
    };

    return (
        <div className="space-y-6">
            {/* Cash Section */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-midblue dark:text-white">Wallets</h3>
                        <button
                            type="button"
                            aria-pressed={walletListView}
                            aria-label={walletListView ? 'Show wallets as cards' : 'Show wallets as a list'}
                            onClick={handleWalletView}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-midblue"
                        >
                            <span
                                className={`inline-flex transition-all duration-200 ease-out ${walletPhase === 'idle' ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                            >
                                {walletListView ? <Squares2X2Icon className="h-5 w-5" /> : <ListBulletIcon className="h-5 w-5" />}
                            </span>
                        </button>
                    </div>
                    <div className="flex gap-3">
                        {!cashAccount && <button type="button" onClick={() => openCreateModal('cash')} className="min-h-11 text-xs font-bold text-midblue">Cash</button>}
                        <button type="button" onClick={() => openCreateModal('ecash')} className="min-h-11 text-xs font-bold text-midblue">E-cash</button>
                        <button type="button" onClick={() => openCreateModal('debit')} className="min-h-11 text-xs font-bold text-midblue">Debit</button>
                    </div>
                </div>
                <div className={`transition-opacity duration-200 ease-out ${walletPhase === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                {walletListView ? (
                    nonCreditAccounts.length === 0 ? (
                        <p className="rounded-2xl border-2 border-dashed border-[var(--card-border)] p-6 text-center text-sm text-[var(--text-muted)]">Add a cash, e-cash, or debit account to see it here.</p>
                    ) : (
                        <ul className="space-y-2">
                            {nonCreditAccounts.map((account) => {
                                const amount = balancesHidden ? '••••' : formatCurrency(account.balance, currencySymbol, currencyPosition);
                                const editable = account.type !== 'cash';
                                const row = (
                                    <>
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                            account.type === 'cash' ? 'bg-emerald-500/10 text-emerald-500' :
                                                account.type === 'debit' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-teal-500/10 text-teal-500'
                                        }`}>
                                            <Icon name={
                                                account.type === 'cash' ? 'BanknotesIcon' :
                                                    account.type === 'debit' ? 'BuildingLibraryIcon' :
                                                        'DevicePhoneMobileIcon'
                                            } className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold text-[var(--text-main)]">{account.name}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{walletTypeLabel(account.type)}</p>
                                        </div>
                                        <p className="shrink-0 font-extrabold text-[var(--text-main)]">{amount}</p>
                                    </>
                                );
                                return (
                                    <li key={account.id}>
                                        {editable ? (
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(account)}
                                                aria-label={`${account.name}, ${amount}`}
                                                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-left"
                                            >
                                                {row}
                                            </button>
                                        ) : (
                                            <div className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                                                {row}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : (
                    <WalletCardDeck
                        accounts={nonCreditAccounts}
                        hidden={balancesHidden}
                        currencySymbol={currencySymbol}
                        currencyPosition={currencyPosition}
                        onSelect={openEditModal}
                    />
                )}
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Time deposits</h3>
                    <button type="button" onClick={() => openCreateModal('deposit')} className="text-xs font-bold text-midblue">
                        + Add time deposit
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {depositAccounts.map(renderCard)}
                    {depositAccounts.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No time deposits yet.</p>
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

            {/* Loan Section */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Loan Accounts</h3>
                    <button onClick={() => openCreateModal('loan')} className="text-xs font-bold text-midblue">
                        + Add Loan Account
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loanAccounts.map(renderCard)}
                    {loanAccounts.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No loan accounts found.</p>
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
                                        accountType === 'loan' ? "e.g., GLoan, Billease" :
                                            accountType === 'deposit' ? "e.g., UNOearn" :
                                            "e.g., BDO Visa"
                            }
                            required
                        />
                    )}

                    {(accountType === 'credit' || accountType === 'loan') && (
                        <Input
                            label={accountType === 'loan' ? "Max Loan Limit" : "Credit Limit"}
                            type="number"
                            step="0.01"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            placeholder="0.00"
                            required
                            leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                        />
                    )}

                    {devOptionsVisible && (accountType === 'credit' || accountType === 'loan') && (
                        <div>
                            <Input
                                label="Amount used"
                                type="number"
                                step="0.01"
                                min="0"
                                value={usedAmount}
                                onChange={(e) => setUsedAmount(e.target.value)}
                                placeholder="0.00"
                                required={!!editingAccount}
                                aria-describedby="amount-used-help"
                                leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                            />
                            <p id="amount-used-help" className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">
                                Sets the outstanding amount. New charges and payments still change it.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsManageModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Save
                        </Button>
                    </div>

                    {editingAccount && (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                setIsManageModalOpen(false);
                                navigate('/bank-rules');
                            }}
                        >
                            Bank rules
                        </Button>
                    )}

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
                                {paySourceAccounts.map(acc => (
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

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Input
                                label="Date"
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                label="Time"
                                type="time"
                                value={payTime}
                                onChange={(e) => setPayTime(e.target.value)}
                                required
                            />
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


        </div>
    );
};
