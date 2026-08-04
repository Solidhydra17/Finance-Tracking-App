import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalcInput, Input, TextArea, Button, Icon } from '@/components/ui';
import { useLoanStore, useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { displayToCents, formatCurrency } from '@/lib/money';

export const AddLoanPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast, currencySymbol, currencyPosition } = useUIStore();
    const { createLoan } = useLoanStore();
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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [walletAccountId, setWalletAccountId] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loanAccountId, setLoanAccountId] = useState<number | ''>(''); // for inbound from loan account (Option B)

    const loanAccounts = accounts.filter(a => a.type === 'loan');
    const cashDebitAccounts = accounts.filter(a => a.type !== 'loan' && a.type !== 'credit');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!personName.trim()) {
            addToast('warning', 'Please enter a person/entity name');
            return;
        }

        const amount = displayToCents(amountDisplay);
        if (amount <= 0) {
            addToast('warning', 'Amount must be greater than zero');
            return;
        }

        // Option B: inbound from loan account -> fund transfer (loan account -> cash wallet)
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

    return (
        <div id="page-add-loan" className="min-h-screen bg-[var(--bg-color)]">
            <header className="bg-[var(--card-bg)] px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-[var(--card-border)]">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-[var(--item-bg)] rounded-full transition-colors"
                >
                    <Icon name="ArrowLeftIcon" className="w-6 h-6 text-[var(--text-main)]" />
                </button>
                <h1 className="text-xl font-bold text-[var(--text-main)]">Add Loan</h1>
            </header>

            <div className="px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Direction Toggle */}
                    <div className="flex bg-[var(--card-bg)] p-1 rounded-2xl shadow-sm border border-[var(--card-border)]">
                        <button
                            type="button"
                            onClick={() => setDirection('outbound')}
                            className={`
                                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                                ${direction === 'outbound'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }
                            `}
                        >
                            I lent money (Outbound)
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('inbound')}
                            className={`
                                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                                ${direction === 'inbound'
                                    ? 'bg-rose-500 text-white shadow-lg'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }
                            `}
                        >
                            I borrowed (Inbound)
                        </button>
                    </div>

                    <div className="bg-[var(--card-bg)] rounded-3xl p-6 shadow-soft space-y-6 border border-[var(--card-border)]">
                        <CalcInput
                            label="Amount"
                            value={amountDisplay}
                            onChange={setAmountDisplay}
                            placeholder="0.00"
                            required
                            className="text-3xl font-bold text-[var(--text-main)]"
                        />

                        {/* Person name - hidden when borrowing from a loan account */}
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
                                    <option value="GLoan" />
                                    <option value="GCredit" />
                                    <option value="SPayLater" />
                                    <option value="SLoan" />
                                    <option value="Maya Credit" />
                                    <option value="Maya Personal Loan" />
                                    <option value="Billease" />
                                    <option value="Tala" />
                                    <option value="JuanHand" />
                                    <option value="Home Credit" />
                                </datalist>
                            )}
                        </div>
                        )}

                        {/* Loan Account Source (only for inbound) */}
                        {direction === 'inbound' && loanAccounts.length > 0 && (
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

                    {/* Hide person/date fields when using a loan account (Option B flow) */}
                    {!(direction === 'inbound' && loanAccountId) && (
                        <>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        label="Date Given/Received"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        label="Due Date"
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    {direction === 'inbound' && loanAccountId && (
                        <div className="flex-1">
                            <Input
                                label="Date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    )}

                        {/* Wallet Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[var(--text-muted)] ml-1">
                                {direction === 'outbound' ? 'Withdraw from Wallet' : (loanAccountId ? 'Deposit into Wallet' : 'Deposit into Wallet')}
                            </label>
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
                        className={`w-full py-5 text-xl font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${
                            direction === 'outbound' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                        }`}
                    >
                        Save Loan
                    </Button>
                </form>
            </div>
        </div>
    );
};
