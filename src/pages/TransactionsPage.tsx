import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Pagination,
    Input,
    Modal,
    SwipeRow,
} from "@/components/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { FilterBar, FilterChip } from "@/components/layout";
import { useTransactions, useCategories, useDebouncedValue } from "@/hooks";
import { useUIStore, useWalletStore } from "@/store";
import { centsToDisplay } from "@/lib/money";
import { Icon } from "@/components/ui";
import type { TransactionTypeFilter } from "@/types";
import { formatDateLocal, parseDateLocal, getMonthRange, formatTime12Hour } from "@/lib/date";

const deleteIcon = <HugeiconsIcon icon={Delete02Icon} size={20} />;

type TransactionSwipeRowProps = {
    title: string;
    subtitle: string;
    iconName: string;
    iconColor: string;
    bgClass: string;
    amountColor: string;
    amountLabel: string;
    recurring: boolean;
    darkMode: boolean;
    onOpen: () => void;
    onHold: () => void;
    onDelete: () => void;
};

const TransactionSwipeRow: React.FC<TransactionSwipeRowProps> = ({
    title,
    subtitle,
    iconName,
    iconColor,
    bgClass,
    amountColor,
    amountLabel,
    recurring,
    darkMode,
    onOpen,
    onHold,
    onDelete,
}) => {
    const skipClick = useRef(false);

    const handleOpenChange = (next: boolean) => {
        if (next) return;
        skipClick.current = true;
        window.setTimeout(() => {
            skipClick.current = false;
        }, 0);
    };

    const handleRowClick = () => {
        if (skipClick.current) return;
        onOpen();
    };

    const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleRowClick();
    };

    return (
        <div className="relative">
            {recurring && (
                <div className="absolute -top-2.5 right-4 z-10">
                    <div className="bg-midblue text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 border border-white">
                        <Icon name="ArrowPathIcon" className="w-2.5 h-2.5" />
                        RECURRING
                    </div>
                </div>
            )}
            <SwipeRow
                actions={[{ id: "delete", label: "Delete", icon: deleteIcon }]}
                onCommit={onDelete}
                onOpenChange={handleOpenChange}
                actionColor="#ef4444"
                drawerColor={darkMode ? "#1f2937" : "#e5e7eb"}
                rowColor={darkMode ? "#0a0a0a" : "#ffffff"}
                textColor={darkMode ? "#f8fafc" : "#111827"}
                height={72}
                radius={16}
                actionWidth={84}
                direction="left"
                label={title}
                onHold={onHold}
                style={recurring ? { boxShadow: "inset 0 0 0 2px #285ccc" } : undefined}
            >
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${title}`}
                    onClick={handleRowClick}
                    onKeyDown={handleRowKeyDown}
                    className="flex w-full min-w-0 items-center gap-3"
                >
                    <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${bgClass}`}>
                        {iconColor ? (
                            <Icon name={iconName as never} className="w-6 h-6" style={{ color: iconColor }} />
                        ) : (
                            <Icon name={iconName as never} className="w-6 h-6 text-[var(--text-muted)]" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-[var(--text-main)] leading-tight truncate">{title}</p>
                        <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{subtitle}</p>
                    </div>
                    <p className={`shrink-0 font-black text-sm ${amountColor}`}>{amountLabel}</p>
                </div>
            </SwipeRow>
        </div>
    );
};

export const TransactionsPage: React.FC = () => {
    const navigate = useNavigate();
    const { filters, setFilters, darkMode } = useUIStore();
    const { categories } = useCategories("both");
    const { accounts, fetchAccounts } = useWalletStore();
    const { transactions, pagination, isLoading, deleteTransaction, setPage } =
        useTransactions(filters);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [detail, setDetail] = useState<{
        title: string;
        typeLabel: string;
        amountLabel: string;
        amountColor: string;
        dateLabel: string;
        timeLabel: string;
        accountLabel: string;
        note: string;
    } | null>(null);
    useEffect(() => {
        setFilters({ searchQuery: debouncedSearchTerm });
    }, [debouncedSearchTerm, setFilters]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const updateDateRange = (month: number, year: number) => {
        setIsMonthPickerOpen(false);
        // Delay filter update slightly to allow modal closing animation to start smoothly
        setTimeout(() => {
            const date = new Date(year, month, 1);
            const range = getMonthRange(date);
            setPage(1);
            setFilters({
                dateRange: {
                    preset: 'custom',
                    startDate: formatDateLocal(range.start),
                    endDate: formatDateLocal(range.end)
                }
            });
        }, 100);
    };

    const handleTypeFilter = (type: TransactionTypeFilter) => {
        setFilters({ transactionType: type });
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const getCategoryById = (id: number) => categories.find((c) => c.id === id);
    const getAccountName = (id?: number) => {
        if (id == null) return "";
        return accounts.find(a => a.id === id)?.name || "";
    };

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, typeof transactions> = {};
        transactions.forEach((t) => {
            const date = new Date(t.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(t);
        });
        return groups;
    }, [transactions]);

    return (
        <div id="page-transactions">
            <header className="px-4 pt-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-wider text-midblue dark:text-white">Transactions</h1>
                </div>
            </header>

            <div id="search-container" className="px-4 mb-4">
                <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={handleSearch}
                    leftIcon={<Icon name="MagnifyingGlassIcon" className="w-5 h-5 text-gray-400" />}
                />
            </div>

            <FilterBar id="transactions-filter-bar">
                <FilterChip
                    id="filter-type-all"
                    isActive={filters.transactionType === "all"}
                    onClick={() => handleTypeFilter("all")}
                >
                    All
                </FilterChip>
                <FilterChip
                    id="filter-type-income"
                    isActive={filters.transactionType === "income"}
                    onClick={() => handleTypeFilter("income")}
                >
                    Income
                </FilterChip>
                <FilterChip
                    id="filter-type-expense"
                    isActive={filters.transactionType === "expense"}
                    onClick={() => handleTypeFilter("expense")}
                >
                    Expenses
                </FilterChip>
                <FilterChip
                    id="filter-type-credit-payment"
                    isActive={filters.transactionType === "credit_payment"}
                    onClick={() => handleTypeFilter("credit_payment")}
                >
                    Credit Payments
                </FilterChip>
                <FilterChip
                    id="filter-type-loans"
                    isActive={filters.transactionType === "loans"}
                    onClick={() => handleTypeFilter("loans")}
                >
                    Loans
                </FilterChip>
                <FilterChip
                    id="filter-type-fund-transfer"
                    isActive={filters.transactionType === "fund_transfer"}
                    onClick={() => handleTypeFilter("fund_transfer")}
                >
                    Fund Transfers
                </FilterChip>
            </FilterBar>
            <div className="mb-4"></div>

            {/* Monthly Navigator */}
            <div className="px-4 py-2">
                <div id="monthly-navigator" className="bg-[var(--card-bg)] rounded-2xl h-[58px] px-3 flex items-center justify-between border-2 border-[var(--card-border)] shadow-soft">
                    <button
                        id="nav-prev-month"
                        onClick={() => {
                            const current = parseDateLocal(filters.dateRange.startDate);
                            const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
                            const range = getMonthRange(prev);
                            setPage(1);
                            setFilters({
                                dateRange: {
                                    preset: 'custom',
                                    startDate: formatDateLocal(range.start),
                                    endDate: formatDateLocal(range.end)
                                }
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-[var(--item-bg)] text-midblue dark:text-white transition-colors"
                    >
                        <Icon name="ChevronLeftIcon" className="w-5 h-5 stroke-[3]" />
                    </button>

                    <button
                        id="nav-month-picker"
                        onClick={() => setIsMonthPickerOpen(true)}
                        className="text-center px-4 py-1 rounded-xl hover:bg-[var(--item-bg)] transition-colors group"
                    >
                        <p className="text-sm font-black text-midblue dark:text-white uppercase tracking-widest group-hover:scale-105 transition-transform flex items-center gap-2">
                            {parseDateLocal(filters.dateRange.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            <Icon name="ChevronDownIcon" className="w-4 h-4" />
                        </p>
                    </button>

                    <button
                        id="nav-next-month"
                        disabled={(() => {
                            const current = parseDateLocal(filters.dateRange.startDate);
                            const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                            const now = new Date();
                            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                            return next > startOfThisMonth;
                        })()}
                        onClick={() => {
                            const current = parseDateLocal(filters.dateRange.startDate);
                            const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                            const range = getMonthRange(next);
                            setPage(1);
                            setFilters({
                                dateRange: {
                                    preset: 'custom',
                                    startDate: formatDateLocal(range.start),
                                    endDate: formatDateLocal(range.end)
                                }
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-gray-50 text-midblue transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Icon name="ChevronRightIcon" className="w-5 h-5 stroke-[3]" />
                    </button>
                </div>
            </div>

            <div className="min-h-[400px] relative">
                {/* Subtle loading overlay for updates */}
                {isLoading && transactions.length > 0 && (
                    <div className="absolute inset-x-0 top-0 z-30 flex justify-center pt-8">
                        <div className="bg-[var(--card-bg)] backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-[var(--card-border)] flex items-center gap-2 animate-bounce">
                            <div className="animate-spin text-midblue">
                                <Icon name="ArrowPathIcon" className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-midblue uppercase tracking-widest">Updating...</span>
                        </div>
                    </div>
                )}

                {isLoading && transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="animate-spin text-midblue">
                            <Icon name="ArrowPathIcon" className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">Fetching transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)] font-medium">
                        <div className="flex justify-center mb-4">
                            <Icon name="InboxIcon" className="w-16 h-16 text-gray-300" />
                        </div>
                        <p className="font-bold">No transactions found</p>
                    </div>
                ) : (
                    <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <div id="transactions-list" className="px-4">
                            {Object.entries(groupedTransactions).map(([date, items]) => (
                                <div key={date} className="mb-6">
                                    <h3 className="text-[10px] font-black text-[var(--text-muted)] opacity-80 uppercase tracking-widest bg-[var(--bg-color)] py-3 sticky top-0 z-[5]">
                                        {date}
                                    </h3>
                                    <div id={`date-group-${date}`} className="space-y-2">
                                        {items.map((transaction: any) => {
                                            const category = getCategoryById(transaction.categoryId);

                                            // Credit Payment specific logic
                                            const isCreditPayment = transaction.type === 'credit_payment';
                                            const isFundTransfer = transaction.type === 'fund_transfer';
                                            const isLoan = transaction.type === 'loan';
                                            const isLoanPayment = transaction.type === 'loan_payment';

                                            let title = transaction.source === 'loan_payment' ? "Loan Repayment" : (category?.name || "Unknown");
                                            let iconName = category?.icon || "BanknotesIcon";
                                            let iconColor = category?.color || "";
                                            let bgClass = transaction.type === "income" ? "bg-success-500/10" : "bg-danger-500/10";
                                            let amountColor = transaction.type === "income" ? "text-success-500 dark:text-success-400" : "text-danger-500 dark:text-danger-400";
                                            let amountPrefix = transaction.type === "income" ? "+" : "-";

                                            if (isCreditPayment) {
                                                title = `${getAccountName(transaction.targetWalletAccountId) || "Credit Card"} Payment`;
                                                iconName = "CreditCardIcon";
                                                bgClass = "bg-gray-500/10";
                                                amountColor = "text-[var(--text-main)]";
                                                iconColor = "gray";
                                                amountPrefix = "";
                                            } else if (isFundTransfer) {
                                                title = `${getAccountName(transaction.walletAccountId) || "Account"} → ${getAccountName(transaction.targetWalletAccountId) || "Account"}`;
                                                iconName = "ArrowsRightLeftIcon";
                                                bgClass = "bg-blue-500/10";
                                                amountColor = "text-[var(--text-main)]";
                                                iconColor = "dodgerblue";
                                                amountPrefix = "";
                                            } else if (isLoan) {
                                                const loan = transaction.originalLoan;
                                                iconName = "HandRaisedIcon";
                                                bgClass = "bg-orange-500/10";
                                                iconColor = "orange";
                                                if (loan.direction === 'outbound') {
                                                    title = `${loan.personName} — Loan Given`;
                                                    amountColor = "text-orange-500 dark:text-orange-400";
                                                    amountPrefix = "-";
                                                } else {
                                                    title = `${loan.personName} — Loan Received`;
                                                    amountColor = "text-[var(--text-main)]";
                                                    amountPrefix = "+";
                                                    bgClass = "bg-gray-500/10";
                                                    iconColor = "gray";
                                                }
                                            } else if (isLoanPayment) {
                                                const loan = transaction.originalLoan;
                                                iconName = "CurrencyDollarIcon";
                                                if (loan.direction === 'outbound') {
                                                    title = `${loan.personName} — Repayment Received`;
                                                    amountColor = "text-success-500 dark:text-success-400";
                                                    amountPrefix = "+";
                                                    bgClass = "bg-success-500/10";
                                                    iconColor = "green";
                                                } else {
                                                    title = `${loan.personName} — Repayment Made`;
                                                    amountColor = "text-danger-500 dark:text-danger-400";
                                                    amountPrefix = "-";
                                                    bgClass = "bg-danger-500/10";
                                                    iconColor = "red";
                                                }
                                            }

                                            let walletLabel = getAccountName(transaction.walletAccountId);
                                            if (isFundTransfer) {
                                                const from = getAccountName(transaction.walletAccountId);
                                                const to = getAccountName(transaction.targetWalletAccountId);
                                                walletLabel = [from, to].filter(Boolean).join(" → ");
                                            } else if (isLoan && transaction.originalLoan) {
                                                const loan = transaction.originalLoan;
                                                walletLabel = getAccountName(
                                                    loan.direction === "outbound"
                                                        ? loan.sourceWalletAccountId
                                                        : loan.destinationWalletAccountId
                                                );
                                            } else if (isLoanPayment) {
                                                walletLabel = getAccountName(
                                                    transaction.originalLoanPayment?.walletAccountId ?? transaction.walletAccountId
                                                );
                                            }

                                            const metaParts = [
                                                formatTime12Hour(transaction.time),
                                                walletLabel,
                                            ].filter(Boolean);
                                            const subtitle = metaParts.join(" • ");

                                            const handleClick = () => {
                                                if (isLoan) {
                                                    // Route to the loan edit screen
                                                    navigate(`/add-loan?edit=${transaction.originalLoan.id}`);
                                                } else if (isLoanPayment) {
                                                    const payment = transaction.originalLoanPayment;
                                                    if (payment?.transactionId) {
                                                        // Phase 4: backed by a real transaction — edit it
                                                        navigate(`/add-transaction?edit=${payment.transactionId}`);
                                                    } else {
                                                        // Legacy synthetic payment — no editable record; go to wallet
                                                        navigate(`/wallet`);
                                                    }
                                                } else {
                                                    navigate(`/add-transaction?edit=${transaction.id}`);
                                                }
                                            };

                                            return (
                                                <TransactionSwipeRow
                                                    key={transaction.id}
                                                    title={title}
                                                    subtitle={subtitle}
                                                    iconName={iconName}
                                                    iconColor={iconColor}
                                                    bgClass={bgClass}
                                                    amountColor={amountColor}
                                                    amountLabel={`${amountPrefix}${centsToDisplay(transaction.amount)}`}
                                                    recurring={transaction.source === 'recurring'}
                                                    darkMode={darkMode}
                                                    onOpen={handleClick}
                                                    onHold={() => {
                                                        const note = String(transaction.note || transaction.originalLoan?.notes || "").trim();
                                                        setDetail({
                                                            title,
                                                            typeLabel: isCreditPayment
                                                                ? "Credit payment"
                                                                : isFundTransfer
                                                                    ? "Transfer"
                                                                    : isLoan
                                                                        ? "Loan"
                                                                        : isLoanPayment
                                                                            ? "Loan payment"
                                                                            : transaction.type === "income"
                                                                                ? "Income"
                                                                                : "Expense",
                                                            amountLabel: `${amountPrefix}${centsToDisplay(transaction.amount)}`,
                                                            amountColor,
                                                            dateLabel: date,
                                                            timeLabel: formatTime12Hour(transaction.time),
                                                            accountLabel: walletLabel,
                                                            note,
                                                        });
                                                    }}
                                                    onDelete={() => {
                                                        if (transaction.id != null) void deleteTransaction(transaction.id);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="py-6">
                            <Pagination
                                page={pagination.page}
                                pageSize={pagination.pageSize}
                                total={pagination.total}
                                onPageChange={setPage}
                            />
                        </div>
                    </div>
                )}
            </div>
            <Modal
                isOpen={detail != null}
                onClose={() => setDetail(null)}
                title="Transaction"
                position="bottom"
            >
                {detail && (
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{detail.typeLabel}</p>
                            <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{detail.title}</p>
                            <p className={`mt-1 text-xl font-black ${detail.amountColor}`}>{detail.amountLabel}</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Date</span>
                                <span className="text-sm font-bold text-[var(--text-main)]">{detail.dateLabel}</span>
                            </div>
                            {detail.timeLabel && (
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Time</span>
                                    <span className="text-sm font-bold text-[var(--text-main)]">{detail.timeLabel}</span>
                                </div>
                            )}
                            {detail.accountLabel && (
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Account</span>
                                    <span className="text-right text-sm font-bold text-[var(--text-main)]">{detail.accountLabel}</span>
                                </div>
                            )}
                        </div>
                        <div className="rounded-2xl bg-[var(--item-bg)] px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Note</p>
                            <p className={`mt-1 whitespace-pre-wrap text-sm font-semibold ${detail.note ? "text-[var(--text-main)]" : "italic text-[var(--text-muted)]"}`}>
                                {detail.note || "No note"}
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Month Picker Modal */}
            <Modal
                isOpen={isMonthPickerOpen}
                onClose={() => setIsMonthPickerOpen(false)}
                title="Select Month & Year"
            >
                <div className="space-y-6 max-h-[60dvh] overflow-y-auto pr-2 scrollbar-hide">
                    {[2026, 2025, 2024].map((year) => (
                        <div key={year} className="space-y-3">
                            <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--card-border)] pb-2">
                                {year}
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const date = new Date(year, i, 1);
                                    const now = new Date();
                                    const isFuture = date > new Date(now.getFullYear(), now.getMonth(), 1);
                                    const isSelected = parseDateLocal(filters.dateRange.startDate).getMonth() === i &&
                                        parseDateLocal(filters.dateRange.startDate).getFullYear() === year;

                                    return (
                                        <button
                                            key={i}
                                            disabled={isFuture}
                                            onClick={() => updateDateRange(i, year)}
                                            className={`
                                                py-3 px-2 rounded-xl text-[10px] font-bold uppercase transition-all
                                                ${isSelected
                                                    ? 'bg-midblue text-white shadow-soft scale-105'
                                                    : isFuture
                                                        ? 'bg-[var(--item-bg)] text-[var(--text-muted)] cursor-not-allowed opacity-30'
                                                        : 'bg-[var(--item-bg)] text-[var(--text-main)] hover:bg-midblue/10 hover:text-midblue'}
                                            `}
                                        >
                                            {date.toLocaleDateString(undefined, { month: 'short' })}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};
