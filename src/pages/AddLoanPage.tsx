import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalcInput, Input, TextArea, Button, Icon } from '@/components/ui';
import { useLoanStore, useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { displayToCents, formatCurrency, centsToDisplay } from '@/lib/money';
import { getCurrentLocalDate, getCurrentLocalTime } from '@/lib/date';
import { loanRepository } from '@/storage/indexeddb/loanRepository';
import type { Loan } from '@/types';

export const AddLoanPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null;
    const isEditMode = editId !== null;

    const { addToast, currencySymbol, currencyPosition } = useUIStore();
    const { createLoan, updateLoan } = useLoanStore(useShallow(state => ({
        createLoan: state.createLoan,
        updateLoan: state.updateLoan,
    })));
    const { accounts, fetchAccounts, createFundTransfer } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        fetchAccounts: state.fetchAccounts,
        createFundTransfer: state.createFundTransfer
    })));

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
    const [personName, setPersonName] = useState('');
    const [amountDisplay, setAmountDisplay] = useState('');
    const [date, setDate] = useState(getCurrentLocalDate());
    const [time, setTime] = useState(getCurrentLocalTime());
    const [dueDate, setDueDate] = useState('');
    const [walletAccountId, setWalletAccountId] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loanAccountId, setLoanAccountId] = useState<number | ''>('');

    // Edit-mode state
    const [editLoan, setEditLoan] = useState<Loan | null>(null);
    const [totalAlreadyPaid, setTotalAlreadyPaid] = useState(0);
    const [hasRepayments, setHasRepayments] = useState(false);
    const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);

    useEffect(() => {
        if (!isEditMode || !editId) return;
        const loadLoan = async () => {
            setIsLoadingEdit(true);
            try {
                const loan = await loanRepository.getById(editId);
                if (!loan) {
                    addToast('error', 'Loan not found');
                    navigate(-1);
                    return;
                }
                const payments = await loanRepository.getPaymentsForLoan(editId);
                const paid = payments.reduce((sum, p) => sum + p.amount, 0);
                setEditLoan(loan);
                setTotalAlreadyPaid(paid);
                setHasRepayments(payments.length > 0);
                setDirection(loan.direction);
                setPersonName(loan.personName);
                setAmountDisplay(centsToDisplay(loan.amount));
                setDate(loan.acquiredDate);
                setTime(loan.time ?? '00:00');
                setDueDate(loan.dueDate ?? '');
                setWalletAccountId(
                    loan.direction === 'outbound'
                        ? (loan.sourceWalletAccountId ?? '')
                        : (loan.destinationWalletAccountId ?? '')
                );
                setNote(loan.notes ?? '');
            } catch (_err) {
                addToast('error', 'Failed to load loan');
                navigate(-1);
            } finally {
                setIsLoadingEdit(false);
            }
        };
        loadLoan();
    }, [editId, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const loanAccounts = accounts.filter(a => a.type === 'loan');
    const cashDebitAccounts = accounts.filter(a => a.type !== 'loan' && a.type !== 'credit');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // EDIT MODE
        if (isEditMode && editLoan && editLoan.id !== undefined) {
            if (!personName.trim()) {
                addToast('warning', 'Please enter a person/entity name');
                return;
            }
            if (!dueDate) {
                addToast('warning', 'Please select a due date');
                return;
            }
            const newAmount = displayToCents(amountDisplay);
            if (newAmount <= 0) {
                addToast('warning', 'Amount must be greater than zero');
                return;
            }
            if (newAmount < totalAlreadyPaid) {
                const paidDisplay = centsToDisplay(totalAlreadyPaid);
                addToast('error', `Amount cannot be less than total already repaid (${paidDisplay})`);
                return;
            }
            const updates: Partial<Omit<Loan, 'id' | 'createdAt'>> = {
                personName,
                acquiredDate: date,
                time,
                dueDate,
                notes: note,
                amount: newAmount,
            };
            if (!hasRepayments) {
                updates.direction = direction;
                updates.sourceWalletAccountId = direction === 'outbound' ? Number(walletAccountId) : undefined;
                updates.destinationWalletAccountId = direction === 'inbound' ? Number(walletAccountId) : undefined;
            }
            setIsSubmitting(true);
            try {
                await updateLoan(editLoan.id, updates);
                addToast('success', 'Loan updated successfully');
                navigate(-1);
            } catch (error: any) {
                addToast('error', error.message || 'Failed to update loan');
                setIsSubmitting(false);
            }
            return;
        }

        // CREATE MODE
        if (!personName.trim() && !(direction === 'inbound' && loanAccountId)) {
            addToast('warning', 'Please enter a person/entity name');
            return;
        }
        const amount = displayToCents(amountDisplay);
        if (amount <= 0) {
            addToast('warning', 'Amount must be greater than zero');
            return;
        }
        if (direction === 'inbound' && loanAccountId) {
            if (!walletAccountId) {
                addToast('warning', 'Please select a destination wallet');
                return;
            }
            setIsSubmitting(true);
            try {
                await createFundTransfer({
                    sourceAccountId: Number(loanAccountId),
                    destinationAccountId: Number(walletAccountId),
                    amount,
                    date,
                    time,
                    notes: note || undefined,
                });
                addToast('success', 'Loan disbursement recorded successfully');
                navigate('/wallet');
            } catch (error: any) {
                addToast('error', error.message || 'Failed to record loan');
                setIsSubmitting(false);
            }
            return;
        }
        if (!personName.trim()) {
            addToast('warning', 'Please enter a person/entity name');
            return;
        }
        if (!walletAccountId) {
            addToast('warning', 'Please select a wallet account');
            return;
        }
        if (!dueDate) {
            addToast('warning', 'Please select a due date');
            return;
        }
        setIsSubmitting(true);
        try {
            await createLoan({
                direction,
                personName,
                amount,
                acquiredDate: date,
                time,
                dueDate,
                status: 'active',
                sourceWalletAccountId: direction === 'outbound' ? Number(walletAccountId) : undefined,
                destinationWalletAccountId: direction === 'inbound' ? Number(walletAccountId) : undefined,
                notes: note,
            });
            addToast('success', 'Loan created successfully');
            navigate('/wallet');
        } catch (error: any) {
            addToast('error', error.message || 'Failed to create loan');
            setIsSubmitting(false);
        }
    };

    if (isLoadingEdit) {
        return (
            <div id="page-add-loan" className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center">
                <div className="animate-spin text-midblue">
                    <Icon name="ArrowPathIcon" className="w-8 h-8" />
                </div>
            </div>
        );
    }

    const lockedWalletName = isEditMode && hasRepayments && walletAccountId
        ? accounts.find(a => a.id === walletAccountId)?.name ?? 'Unknown'
        : null;

    return (
        <div id="page-add-loan" className="min-h-screen bg-[var(--bg-color)]">
            <header className="bg-[var(--card-bg)] px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-[var(--card-border)]">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-[var(--item-bg)] rounded-full transition-colors"
                >
                    <Icon name="ArrowLeftIcon" className="w-6 h-6 text-[var(--text-main)]" />
                </button>
                <h1 className="text-xl font-bold text-[var(--text-main)]">
                    {isEditMode ? 'Edit Loan' : 'Add Loan'}
                </h1>
            </header>

            <div className="px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {isEditMode && hasRepayments ? (
                        <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] flex items-center gap-3">
                            <Icon name="LockClosedIcon" className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm font-bold text-[var(--text-main)]">
                                    {direction === 'outbound' ? 'I lent money — they owe me' : 'I borrowed — I owe them'}
                                </p>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                                    Direction locked — repayments exist
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex bg-[var(--card-bg)] p-1 rounded-2xl shadow-sm border border-[var(--card-border)]">
                            <button
                                type="button"
                                onClick={() => setDirection('outbound')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${direction === 'outbound' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                I lent money — they owe me
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection('inbound')}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${direction === 'inbound' ? 'bg-rose-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                I borrowed — I owe them
                            </button>
                        </div>
                    )}

                    <div className="bg-[var(--card-bg)] rounded-3xl p-6 shadow-soft space-y-6 border border-[var(--card-border)]">
                        <CalcInput
                            label="Amount"
                            value={amountDisplay}
                            onChange={setAmountDisplay}
                            placeholder="0.00"
                            required
                            className="text-3xl font-bold text-[var(--text-main)]"
                        />

                        {isEditMode && hasRepayments && totalAlreadyPaid > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
                                <Icon name="ExclamationTriangleIcon" className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    This loan has repayments totalling {centsToDisplay(totalAlreadyPaid)}. Amount cannot be set below this value.
                                </p>
                            </div>
                        )}

                        {!(direction === 'inbound' && loanAccountId) && (
                            <div>
                                <Input
                                    label={direction === 'outbound' ? "Who did you lend to?" : "Who did you borrow from?"}
                                    placeholder="Name of person or bank"
                                    value={personName}
                                    onChange={(e) => setPersonName(e.target.value)}
                                    required={!(direction === 'inbound' && loanAccountId)}
                                    list={direction === 'inbound' ? "loan-providers" : undefined}
                                />
                                {direction === 'inbound' && (
                                    <datalist id="loan-providers">
                                        <option value="GLoan" /><option value="GCredit" /><option value="SPayLater" />
                                        <option value="SLoan" /><option value="Maya Credit" /><option value="Maya Personal Loan" />
                                        <option value="Billease" /><option value="Tala" /><option value="JuanHand" />
                                        <option value="Home Credit" />
                                    </datalist>
                                )}
                            </div>
                        )}

                        {!isEditMode && direction === 'inbound' && loanAccounts.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-muted)] ml-1">
                                    Source Loan Account <span className="font-normal text-[var(--text-muted)]">(optional — leave blank for manual loans)</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={loanAccountId}
                                        onChange={(e) => setLoanAccountId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full h-[56px] px-4 appearance-none rounded-2xl border-2 border-transparent bg-[var(--item-bg)] text-lg font-bold text-[var(--text-main)] hover:border-midblue/20 focus:border-midblue outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">No loan account (manual)</option>
                                        {loanAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Avail: {formatCurrency(Math.max(0, (acc.creditLimit || 0) - acc.balance), currencySymbol, currencyPosition)})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Icon name="ChevronUpDownIcon" className="w-5 h-5 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!(direction === 'inbound' && loanAccountId) && (
                            <>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input label="Date Given/Received" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                                    </div>
                                    <div className="flex-1">
                                        <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                                </div>
                            </>
                        )}
                        {!isEditMode && direction === 'inbound' && loanAccountId && (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                                </div>
                                <div className="flex-1">
                                    <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[var(--text-muted)] ml-1">
                                {direction === 'outbound' ? 'Withdraw from Wallet' : 'Deposit into Wallet'}
                            </label>
                            {isEditMode && hasRepayments ? (
                                <div className="w-full h-[56px] px-4 flex items-center rounded-2xl bg-[var(--item-bg)] border-2 border-transparent gap-2 opacity-60 cursor-not-allowed">
                                    <Icon name="LockClosedIcon" className="w-4 h-4 text-[var(--text-muted)]" />
                                    <span className="text-lg font-bold text-[var(--text-muted)]">{lockedWalletName ?? 'Locked'}</span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={walletAccountId}
                                        onChange={(e) => setWalletAccountId(Number(e.target.value))}
                                        required
                                        className="w-full h-[56px] px-4 appearance-none rounded-2xl border-2 border-transparent bg-[var(--item-bg)] text-lg font-bold text-[var(--text-main)] hover:border-midblue/20 focus:border-midblue outline-none transition-all cursor-pointer"
                                    >
                                        <option value="" disabled>Select Wallet...</option>
                                        {(direction === 'inbound' ? cashDebitAccounts : accounts.filter(a => a.type !== 'loan')).map(account => (
                                            <option key={account.id} value={account.id}>
                                                {account.name} ({formatCurrency(account.type === 'credit' ? ((account.creditLimit || 0) - Math.max(0, account.balance)) : account.balance, currencySymbol, currencyPosition)})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Icon name="ChevronUpDownIcon" className="w-5 h-5 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <TextArea
                                label="Note (Optional)"
                                placeholder="Add a note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value.slice(0, 150))}
                                rows={2}
                                maxLength={150}
                                className="text-lg"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        className={`w-full py-5 text-xl font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${direction === 'outbound' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                    >
                        {isEditMode ? 'Update Loan' : 'Save Loan'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
