import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardBody,
    Pagination,
    Input,
    Modal,
} from "@/components/ui";
import { FilterBar, FilterChip } from "@/components/layout";
import { useTransactions, useCategories } from "@/hooks";
import { useUIStore } from "@/store";
import { centsToDisplay } from "@/lib/money";
import { Icon } from "@/components/ui";
import type { TransactionTypeFilter } from "@/types";
import { formatDateLocal, parseDateLocal, getMonthRange } from "@/lib/date";

export const TransactionsPage: React.FC = () => {
    const navigate = useNavigate();
    const { filters, setFilters } = useUIStore();
    const { categories } = useCategories("both");
    const { transactions, pagination, isLoading, deleteTransaction, setPage } =
        useTransactions(filters);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const updateDateRange = (month: number, year: number) => {
        setIsMonthPickerOpen(false);
        // Delay filter update slightly to allow modal closing animation to start smoothly
        setTimeout(() => {
            const date = new Date(year, month, 1);
            const range = getMonthRange(date);
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
        setFilters({ searchQuery: e.target.value });
    };

    const getCategoryById = (id: number) => categories.find((c) => c.id === id);

    const handleDelete = async (id: number) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        if (confirmDeleteId !== null) {
            await deleteTransaction(confirmDeleteId);
            setConfirmDeleteId(null);
        }
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
            <header className="px-4 pt-4 mb-2">
                <h1 className="text-3xl font-extrabold text-midblue tracking-wider">KURIPOT</h1>
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
            </FilterBar>
            <div className="mb-4"></div>

            {/* Monthly Navigator */}
            <div className="px-4 py-2">
                <div id="monthly-navigator" className="bg-white rounded-2xl h-[58px] px-3 flex items-center justify-between border-2 border-gray-100 shadow-soft">
                    <button
                        id="nav-prev-month"
                        onClick={() => {
                            const current = parseDateLocal(filters.dateRange.startDate);
                            const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
                            const range = getMonthRange(prev);
                            setFilters({
                                dateRange: {
                                    preset: 'custom',
                                    startDate: formatDateLocal(range.start),
                                    endDate: formatDateLocal(range.end)
                                }
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-gray-50 text-midblue transition-colors"
                    >
                        <Icon name="ChevronLeftIcon" className="w-5 h-5 stroke-[3]" />
                    </button>

                    <button
                        id="nav-month-picker"
                        onClick={() => setIsMonthPickerOpen(true)}
                        className="text-center px-4 py-1 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                        <p className="text-sm font-black text-midblue uppercase tracking-widest group-hover:scale-105 transition-transform flex items-center gap-2">
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
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2 animate-bounce">
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
                    <div className="text-center py-12 text-gray-500">
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
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 py-3 sticky top-0 z-[5]">
                                    {date}
                                </h3>
                                <div id={`date-group-${date}`} className="space-y-2">
                                    {items.map((transaction) => {
                                        const category = getCategoryById(transaction.categoryId);
                                        return (
                                            <Card 
                                                key={transaction.id} 
                                                className="border-0 shadow-soft transition-all cursor-pointer overflow-hidden"
                                            >
                                                <CardBody className="flex items-center justify-between p-3">
                                                    <div 
                                                        className="flex items-center gap-3 flex-1"
                                                        onClick={() => navigate(`/add-transaction?edit=${transaction.id}`)}
                                                    >
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${transaction.type === "income" ? "bg-success-50" : "bg-danger-50"
                                                            }`}>
                                                            {category?.icon ? (
                                                                <Icon name={category.icon} className="w-6 h-6" style={{ color: category.color }} />
                                                            ) : (
                                                                <Icon name="BanknotesIcon" className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 leading-tight">
                                                                {category?.name || "Unknown"}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                {transaction.note || "No note"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <p 
                                                            className={`font-black text-sm ${transaction.type === "income" ? "text-success-600" : "text-danger-600"}`}
                                                            onClick={() => navigate(`/add-transaction?edit=${transaction.id}`)}
                                                        >
                                                            {transaction.type === "income" ? "+" : "-"}
                                                            {centsToDisplay(transaction.amount)}
                                                        </p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(transaction.id!);
                                                            }}
                                                            className="p-1.5 rounded-xl hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition-all z-10"
                                                        >
                                                            <Icon name="TrashIcon" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </CardBody>
                                            </Card>
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
            {/* Month Picker Modal */}
            <Modal
                isOpen={isMonthPickerOpen}
                onClose={() => setIsMonthPickerOpen(false)}
                title="Select Month & Year"
            >
                <div className="space-y-6 max-h-[60dvh] overflow-y-auto pr-2 scrollbar-hide">
                    {[2026, 2025, 2024].map((year) => (
                        <div key={year} className="space-y-3">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
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
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                                                        : 'bg-gray-50 text-gray-500 hover:bg-midblue/10 hover:text-midblue'}
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

            {/* Deletion Confirmation Modal */}
            <Modal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                title="Confirm Deletion"
                size="sm"
                position="bottom"
            >
                <div className="space-y-4 pt-2 pb-6">
                    <p className="text-gray-600 text-center font-medium">
                        Are you sure you want to delete this transaction? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 py-4 rounded-2xl bg-danger-500 text-white font-bold hover:bg-danger-600 shadow-lg shadow-danger-200 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
