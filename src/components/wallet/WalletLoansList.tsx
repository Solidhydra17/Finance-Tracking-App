import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanStore, useWalletStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { Modal, Input, Button, Icon } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import { formatDateLocal, getCurrentLocalDate, getCurrentLocalTime } from '@/lib/date';
import type { Loan, LoanPayment, WalletAccount } from '@/types';
import { db } from '@/storage/indexeddb/database';

// ----------- Types -----------

type RepayTarget = { type: 'p2p'; loan: Loan } | { type: 'institutional'; account: WalletAccount };

interface LoanWithRemaining {
    loan: Loan;
    totalPaid: number;
    remaining: number;
    payments: LoanPayment[];
}

interface InstitutionalPaymentRow {
    id: number;
    date: string;
    time: string;
    amount: number;
    sourceAccountName: string;
    notes: string;
}

// ----------- Component -----------

export const WalletLoansList: React.FC = () => {
    const navigate = useNavigate();
    const { loans, repayLoan, getLoanDetails } = useLoanStore(useShallow(state => ({
        loans: state.loans,
        repayLoan: state.repayLoan,
        getLoanDetails: state.getLoanDetails,
    })));

    const { accounts, payCreditCard } = useWalletStore(useShallow(state => ({
        accounts: state.accounts,
        payCreditCard: state.payCreditCard
    })));

    const { currencySymbol, currencyPosition, addToast } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        addToast: state.addToast
    })));

    // ----------- Payment totals for P2P loans -----------
    const [loanDetails, setLoanDetails] = useState<Map<number, { totalPaid: number; remaining: number; payments: LoanPayment[] }>>(new Map());

    const loadLoanDetails = useCallback(async () => {
        const map = new Map<number, { totalPaid: number; remaining: number; payments: LoanPayment[] }>();
        for (const loan of loans) {
            if (!loan.id) continue;
            const detail = await getLoanDetails(loan.id);
            if (detail) {
                const totalPaid = detail.payments.reduce((sum, p) => sum + p.amount, 0);
                map.set(loan.id, {
                    totalPaid,
                    remaining: Math.max(0, loan.amount - totalPaid),
                    payments: detail.payments
                });
            }
        }
        setLoanDetails(map);
    }, [loans, getLoanDetails]);

    useEffect(() => {
        loadLoanDetails();
    }, [loadLoanDetails]);

    // ----------- Repay modal state -----------
    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [repayTarget, setRepayTarget] = useState<RepayTarget | null>(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayNotes, setRepayNotes] = useState('');
    const [walletAccountId, setWalletAccountId] = useState<number | ''>('');
    const [date, setDate] = useState(getCurrentLocalDate());
    const [time, setTime] = useState(getCurrentLocalTime());
    const [isRepaying, setIsRepaying] = useState(false);

    // ----------- Detail/History modal state -----------
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailLoan, setDetailLoan] = useState<LoanWithRemaining | null>(null);
    const [detailInstitutional, setDetailInstitutional] = useState<{ account: WalletAccount; payments: InstitutionalPaymentRow[] } | null>(null);

    // ----------- Completed section toggle -----------
    const [showCompleted, setShowCompleted] = useState(false);

    // ----------- Helpers -----------
    const fmt = (cents: number) => formatCurrency(cents, currencySymbol, currencyPosition);
    const nonLoanAccounts = accounts.filter(a => a.type !== 'loan' && a.type !== 'credit');

    const getRemaining = (loan: Loan): number => {
        if (!loan.id) return loan.amount;
        return loanDetails.get(loan.id)?.remaining ?? loan.amount;
    };

    const getTotalPaid = (loan: Loan): number => {
        if (!loan.id) return 0;
        return loanDetails.get(loan.id)?.totalPaid ?? 0;
    };

    // ----------- Segmentation -----------
    const activeOutbound = loans.filter(l => l.direction === 'outbound' && l.status !== 'paid');
    const activeInbound = loans.filter(l => l.direction !== 'outbound' && l.status !== 'paid');
    const completedP2P = loans.filter(l => l.status === 'paid');

    // Institutional: loan accounts with balance > 0 are active, balance === 0 are completed
    const institutionalActive = accounts.filter(a => a.type === 'loan' && a.balance > 0);
    const institutionalCompleted = accounts.filter(a => a.type === 'loan' && a.balance === 0);

    // ----------- Open repay modal -----------
    const openRepayP2P = (loan: Loan) => {
        setRepayTarget({ type: 'p2p', loan });
        setRepayAmount('');
        setRepayNotes('');
        const originalWalletId = loan.direction === 'outbound' ? loan.sourceWalletAccountId : loan.destinationWalletAccountId;
        const defaultWallet = nonLoanAccounts.find(a => a.type === 'cash') || nonLoanAccounts[0];
        setWalletAccountId(originalWalletId || defaultWallet?.id || '');
        setDate(getCurrentLocalDate());
        setTime(getCurrentLocalTime());
        setIsRepayModalOpen(true);
    };

    const openRepayInstitutional = (account: WalletAccount) => {
        setRepayTarget({ type: 'institutional', account });
        setRepayAmount('');
        setRepayNotes('');
        const defaultWallet = nonLoanAccounts.find(a => a.type === 'cash') || nonLoanAccounts[0];
        setWalletAccountId(defaultWallet?.id || '');
        setDate(getCurrentLocalDate());
        setTime(getCurrentLocalTime());
        setIsRepayModalOpen(true);
    };

    // ----------- Open detail modal -----------
    const openDetailP2P = async (loan: Loan) => {
        if (!loan.id) return;
        const detail = await getLoanDetails(loan.id);
        if (!detail) return;
        const totalPaid = detail.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, loan.amount - totalPaid);
        const sorted = [...detail.payments].sort((a, b) => {
            if (b.paidDate !== a.paidDate) return b.paidDate.localeCompare(a.paidDate);
            return (b.time || '00:00').localeCompare(a.time || '00:00');
        });
        setDetailLoan({ loan, totalPaid, remaining, payments: sorted });
        setDetailInstitutional(null);
        setIsDetailModalOpen(true);
    };

    const openDetailInstitutional = async (account: WalletAccount) => {
        if (!account.id) return;
        // Fetch credit_payment transactions directed at this account, newest first
        const txs = await db.transactions
            .where('targetWalletAccountId').equals(account.id)
            .filter(tx => tx.type === 'credit_payment' && !tx.deletedAt)
            .toArray();
        txs.sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return (b.time || '00:00').localeCompare(a.time || '00:00');
        });
        const rows: InstitutionalPaymentRow[] = txs.map(tx => {
            const srcAcc = accounts.find(a => a.id === tx.walletAccountId);
            return {
                id: Number(tx.id),
                date: tx.date,
                time: tx.time || '00:00',
                amount: tx.amount,
                sourceAccountName: srcAcc?.name ?? 'Unknown',
                notes: tx.note || ''
            };
        });
        setDetailInstitutional({ account, payments: rows });
        setDetailLoan(null);
        setIsDetailModalOpen(true);
    };

    // ----------- Handle repay -----------
    const handleRepay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repayTarget || !walletAccountId) return;

        const amountCents = Math.round(parseFloat(repayAmount) * 100);
        if (amountCents <= 0) {
            addToast('error', 'Amount must be greater than 0');
            return;
        }

        // Client-side over-payment check
        if (repayTarget.type === 'p2p') {
            const remaining = getRemaining(repayTarget.loan);
            if (amountCents > remaining) {
                addToast('error', `Cannot exceed remaining balance of ${fmt(remaining)}`);
                return;
            }
        } else {
            if (amountCents > repayTarget.account.balance) {
                addToast('error', `Cannot exceed outstanding balance of ${fmt(repayTarget.account.balance)}`);
                return;
            }
        }

        setIsRepaying(true);
        try {
            if (repayTarget.type === 'p2p') {
                await repayLoan(
                    repayTarget.loan.id!,
                    amountCents,
                    Number(walletAccountId),
                    date,
                    repayNotes || undefined,
                    time
                );
            } else {
                await payCreditCard({
                    creditCardAccountId: repayTarget.account.id!,
                    sourceWalletAccountId: Number(walletAccountId),
                    amount: amountCents,
                    date,
                    time,
                    notes: repayNotes || 'Manual Repayment'
                });
            }
            addToast('success', 'Repayment recorded successfully');
            setIsRepayModalOpen(false);
            await loadLoanDetails();
        } catch (error: any) {
            addToast('error', error.message || 'Repayment failed');
        } finally {
            setIsRepaying(false);
        }
    };

    // ----------- Status badge -----------
    const statusBadge = (status: string) => {
        const s = status.replace('_', ' ').toUpperCase();
        const color =
            status === 'paid' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' :
            status === 'partially_paid' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' :
            'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
        return <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${color}`}>{s}</span>;
    };

    // ----------- Render P2P loan card -----------
    const renderP2PLoanCard = (loan: Loan) => {
        const remaining = getRemaining(loan);
        const totalPaid = getTotalPaid(loan);
        const isPartial = loan.status === 'partially_paid';
        const colorClass = loan.direction === 'outbound' ? 'text-emerald-500' : 'text-rose-500';

        return (
            <div key={loan.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
                <button
                    type="button"
                    onClick={() => openDetailP2P(loan)}
                    className="w-full text-left"
                >
                    <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-[var(--text-main)] leading-tight">{loan.personName}</p>
                        <p className={`font-extrabold ${colorClass}`}>{fmt(remaining)}</p>
                    </div>
                    {isPartial && (
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">
                            Original: {fmt(loan.amount)} · Paid: {fmt(totalPaid)}
                        </p>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                        Due: {formatDateLocal(new Date(loan.dueDate))}
                    </p>
                </button>
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-[var(--card-border)]">
                    {statusBadge(loan.status)}
                    <button
                        onClick={() => openRepayP2P(loan)}
                        className="text-xs font-bold text-white bg-midblue px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Log Repayment
                    </button>
                </div>
            </div>
        );
    };

    // ----------- Render institutional loan card -----------
    const renderInstitutionalLoanCard = (account: WalletAccount) => {
        return (
            <div key={`inst_${account.id}`} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
                <button
                    type="button"
                    onClick={() => openDetailInstitutional(account)}
                    className="w-full text-left"
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-500">
                                <Icon name="DocumentTextIcon" className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-[var(--text-main)] leading-tight">{account.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Institutional</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-extrabold text-rose-500">{fmt(account.balance)}</p>
                            {account.creditLimit && (
                                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                                    Limit: {fmt(account.creditLimit)}
                                </p>
                            )}
                        </div>
                    </div>
                </button>
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-[var(--card-border)]">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                        ACTIVE
                    </span>
                    <button
                        onClick={() => openRepayInstitutional(account)}
                        className="text-xs font-bold text-white bg-midblue px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Log Repayment
                    </button>
                </div>
            </div>
        );
    };

    // ----------- Repay modal remaining info -----------
    const repayRemaining = repayTarget?.type === 'p2p'
        ? getRemaining(repayTarget.loan)
        : repayTarget?.type === 'institutional'
            ? repayTarget.account.balance
            : 0;
    const repayOriginal = repayTarget?.type === 'p2p' ? repayTarget.loan.amount : undefined;
    const repayTotalPaid = repayTarget?.type === 'p2p' ? getTotalPaid(repayTarget.loan) : undefined;
    const currentRepayAmountCents = Math.round(parseFloat(repayAmount || '0') * 100);
    const wouldOverpay = currentRepayAmountCents > repayRemaining && repayRemaining > 0;

    return (
        <div className="space-y-6 mt-6">
            {/* Outbound / You Lent */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Owed to You — You Lent</h3>
                    <button onClick={() => navigate('/add-loan')} className="text-xs font-bold text-midblue">+ Add Loan</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeOutbound.map(renderP2PLoanCard)}
                    {activeOutbound.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No active outbound loans.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Inbound / You Borrowed */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">You Owe — You Borrowed</h3>
                    <button onClick={() => navigate('/add-loan')} className="text-xs font-bold text-midblue">+ Add Loan</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeInbound.map(renderP2PLoanCard)}
                    {institutionalActive.map(renderInstitutionalLoanCard)}
                    {activeInbound.length === 0 && institutionalActive.length === 0 && (
                        <div className="col-span-full text-center p-6 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                            <p className="text-sm text-[var(--text-muted)] font-medium">No active borrowed loans.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Completed Loans — collapsed by default */}
            {(completedP2P.length > 0 || institutionalCompleted.length > 0) && (
                <section className="space-y-3">
                    <button
                        onClick={() => setShowCompleted(p => !p)}
                        className="flex items-center gap-2 px-1 w-full text-left"
                    >
                        <h3 className="font-bold text-[var(--text-muted)] uppercase text-xs tracking-widest">
                            Completed Loans ({completedP2P.length + institutionalCompleted.length})
                        </h3>
                        <Icon
                            name={showCompleted ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                            className="w-4 h-4 text-[var(--text-muted)]"
                        />
                    </button>
                    {showCompleted && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {completedP2P.map(loan => {
                                const totalPaid = getTotalPaid(loan);
                                return (
                                    <div key={loan.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm opacity-70">
                                        <button
                                            type="button"
                                            onClick={() => openDetailP2P(loan)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-bold text-[var(--text-main)] leading-tight">{loan.personName}</p>
                                                <p className="font-extrabold text-emerald-500">{fmt(loan.amount)}</p>
                                            </div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-medium">
                                                Paid {fmt(totalPaid)} · Due: {formatDateLocal(new Date(loan.dueDate))}
                                            </p>
                                        </button>
                                        <div className="pt-3 mt-2 border-t border-[var(--card-border)]">
                                            {statusBadge('paid')}
                                        </div>
                                    </div>
                                );
                            })}
                            {institutionalCompleted.map(account => (
                                <div key={`inst_done_${account.id}`} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm opacity-70">
                                    <button
                                        type="button"
                                        onClick={() => openDetailInstitutional(account)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                                    <Icon name="DocumentTextIcon" className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-main)] leading-tight">{account.name}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Institutional</p>
                                                </div>
                                            </div>
                                            <p className="font-extrabold text-emerald-500">{fmt(0)}</p>
                                        </div>
                                    </button>
                                    <div className="pt-3 mt-2 border-t border-[var(--card-border)]">
                                        {statusBadge('paid')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Repay Modal */}
            <Modal
                isOpen={isRepayModalOpen}
                onClose={() => setIsRepayModalOpen(false)}
                title="Log Repayment"
                size="md"
            >
                <form onSubmit={handleRepay} className="space-y-4 p-4">
                    {/* Info row */}
                    {repayTarget && (
                        <div className="bg-[var(--item-bg)] rounded-xl px-4 py-3 space-y-1 text-sm">
                            {repayOriginal !== undefined && (
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)] font-medium">Original</span>
                                    <span className="font-bold text-[var(--text-main)]">{fmt(repayOriginal)}</span>
                                </div>
                            )}
                            {repayTotalPaid !== undefined && repayTotalPaid > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)] font-medium">Already Paid</span>
                                    <span className="font-bold text-emerald-500">{fmt(repayTotalPaid)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)] font-medium">Remaining</span>
                                <span className="font-bold text-rose-500">{fmt(repayRemaining)}</span>
                            </div>
                        </div>
                    )}

                    <Input
                        label="Amount Paid"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        leftIcon={<span className="text-[var(--text-muted)] font-bold px-3">{currencySymbol}</span>}
                    />
                    {wouldOverpay && (
                        <p className="text-xs font-bold text-rose-500 -mt-2">
                            Cannot exceed remaining balance of {fmt(repayRemaining)}
                        </p>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest ml-1">
                            {repayTarget?.type === 'p2p' && repayTarget.loan.direction === 'outbound' ? 'Receive into Wallet' : 'Pay from Wallet'}
                        </label>
                        <select
                            value={walletAccountId}
                            onChange={(e) => setWalletAccountId(Number(e.target.value))}
                            required
                            className="w-full h-12 px-4 rounded-xl border-2 border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-main)] font-medium focus:border-midblue focus:ring-0 outline-none transition-colors"
                        >
                            <option value="" disabled>Select Wallet Account</option>
                            {nonLoanAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({fmt(account.balance)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                        <div className="flex-1">
                            <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                        </div>
                    </div>

                    <Input
                        label="Notes (Optional)"
                        value={repayNotes}
                        onChange={(e) => setRepayNotes(e.target.value)}
                        placeholder="e.g., Partial payment"
                    />

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsRepayModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={isRepaying}
                            disabled={wouldOverpay || isRepaying}
                        >
                            Confirm Repayment
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Detail / Payment History Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Loan Details"
                size="md"
            >
                <div className="p-4 space-y-5">
                    {detailLoan && (() => {
                        const { loan, totalPaid, remaining, payments } = detailLoan;
                        return (
                            <>
                                {/* Loan summary */}
                                <div className="bg-[var(--item-bg)] rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            {loan.direction === 'outbound' ? 'You Lent' : 'You Borrowed'}
                                        </span>
                                        {statusBadge(loan.status)}
                                    </div>
                                    <p className="font-bold text-lg text-[var(--text-main)]">{loan.personName}</p>
                                    <div className="grid grid-cols-3 gap-2 pt-2">
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Original</p>
                                            <p className="font-bold text-[var(--text-main)]">{fmt(loan.amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Paid</p>
                                            <p className="font-bold text-emerald-500">{fmt(totalPaid)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Remaining</p>
                                            <p className="font-bold text-rose-500">{fmt(remaining)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                                        Due: {formatDateLocal(new Date(loan.dueDate))}
                                    </p>
                                    {loan.notes && (
                                        <p className="text-xs text-[var(--text-muted)] italic">{loan.notes}</p>
                                    )}
                                </div>

                                {/* Payment history */}
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                                        Payment History ({payments.length})
                                    </h4>
                                    {payments.length === 0 ? (
                                        <div className="text-center p-4 border-2 border-dashed border-[var(--card-border)] rounded-xl">
                                            <p className="text-sm text-[var(--text-muted)]">No payments yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {payments.map(p => {
                                                const acc = accounts.find(a => a.id === p.walletAccountId);
                                                return (
                                                    <div key={p.id} className="flex justify-between items-start bg-[var(--item-bg)] rounded-xl px-3 py-2.5">
                                                        <div>
                                                            <p className="text-sm font-bold text-[var(--text-main)]">{fmt(p.amount)}</p>
                                                            <p className="text-[10px] text-[var(--text-muted)] font-medium">
                                                                {formatDateLocal(new Date(p.paidDate))} {p.time ? `· ${p.time}` : ''}
                                                            </p>
                                                            {acc && (
                                                                <p className="text-[10px] text-[var(--text-muted)]">{acc.name}</p>
                                                            )}
                                                            {p.notes && (
                                                                <p className="text-[10px] text-[var(--text-muted)] italic">{p.notes}</p>
                                                            )}
                                                        </div>
                                                        <Icon name="CheckCircleIcon" className="w-4 h-4 text-emerald-500 mt-0.5" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}

                    {detailInstitutional && (() => {
                        const { account, payments } = detailInstitutional;
                        return (
                            <>
                                {/* Account summary */}
                                <div className="bg-[var(--item-bg)] rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Institutional Loan</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${account.balance === 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'}`}>
                                            {account.balance === 0 ? 'PAID' : 'ACTIVE'}
                                        </span>
                                    </div>
                                    <p className="font-bold text-lg text-[var(--text-main)]">{account.name}</p>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Outstanding</p>
                                            <p className="font-bold text-rose-500">{fmt(account.balance)}</p>
                                        </div>
                                        {account.creditLimit && (
                                            <div>
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Limit</p>
                                                <p className="font-bold text-[var(--text-main)]">{fmt(account.creditLimit)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Payment history */}
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                                        Payment History ({payments.length})
                                    </h4>
                                    {payments.length === 0 ? (
                                        <div className="text-center p-4 border-2 border-dashed border-[var(--card-border)] rounded-xl">
                                            <p className="text-sm text-[var(--text-muted)]">No payments recorded</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {payments.map(p => (
                                                <div key={p.id} className="flex justify-between items-start bg-[var(--item-bg)] rounded-xl px-3 py-2.5">
                                                    <div>
                                                        <p className="text-sm font-bold text-[var(--text-main)]">{fmt(p.amount)}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-medium">
                                                            {formatDateLocal(new Date(p.date))} {p.time !== '00:00' ? `· ${p.time}` : ''}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--text-muted)]">From: {p.sourceAccountName}</p>
                                                        {p.notes && <p className="text-[10px] text-[var(--text-muted)] italic">{p.notes}</p>}
                                                    </div>
                                                    <Icon name="CheckCircleIcon" className="w-4 h-4 text-emerald-500 mt-0.5" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>
        </div>
    );
};
