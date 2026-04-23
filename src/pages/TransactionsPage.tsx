import React, { useState, useMemo } from "react";
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

export const TransactionsPage: React.FC = () => {
    const { filters, setFilters } = useUIStore();
    const { categories } = useCategories("both");
    const { transactions, pagination, isLoading, deleteTransaction, setPage } =
        useTransactions(filters);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    const updateDateRange = (month: number, year: number) => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        setFilters({
            dateRange: {
                preset: 'custom',
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            }
        });
        setIsMonthPickerOpen(false);
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
        if (window.confirm("Delete this transaction?")) {
            await deleteTransaction(id);
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin text-midblue">
                    <Icon name="ArrowPathIcon" className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-gray-400 animate-pulse">Fetching transactions...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            <div className="px-4">
                <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={handleSearch}
                    leftIcon={<Icon name="MagnifyingGlassIcon" className="w-5 h-5 text-gray-400" />}
                />
            </div>

            <FilterBar>
                <FilterChip
                    isActive={filters.transactionType === "all"}
                    onClick={() => handleTypeFilter("all")}
                >
                    All
                </FilterChip>
                <FilterChip
                    isActive={filters.transactionType === "income"}
                    onClick={() => handleTypeFilter("income")}
                >
                    Income
                </FilterChip>
                <FilterChip
                    isActive={filters.transactionType === "expense"}
                    onClick={() => handleTypeFilter("expense")}
                >
                    Expenses
                </FilterChip>
            </FilterBar>

            {/* Monthly Navigator */}
            <div className="px-4 py-2">
                <div className="bg-white rounded-2xl p-3 flex items-center justify-between border-2 border-gray-100 shadow-soft">
                    <button
                        onClick={() => {
                            const current = new Date(filters.dateRange.startDate);
                            const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
                            const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0);
                            setFilters({
                                dateRange: {
                                    preset: 'custom',
                                    startDate: prev.toISOString().split('T')[0],
                                    endDate: lastDay.toISOString().split('T')[0]
                                }
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-gray-50 text-midblue transition-colors"
                    >
                        <Icon name="ChevronLeftIcon" className="w-5 h-5 stroke-[3]" />
                    </button>

                    <button 
                        onClick={() => setIsMonthPickerOpen(true)}
                        className="text-center px-4 py-1 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                        <p className="text-sm font-black text-midblue uppercase tracking-widest group-hover:scale-105 transition-transform flex items-center gap-2">
                            {new Date(filters.dateRange.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            <Icon name="ChevronDownIcon" className="w-4 h-4" />
                        </p>
                    </button>

                    <button
                        disabled={(() => {
                            const current = new Date(filters.dateRange.startDate);
                            const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                            const now = new Date();
                            return next > new Date(now.getFullYear(), now.getMonth(), 1);
                        })()}
                        onClick={() => {
                            const current = new Date(filters.dateRange.startDate);
                            const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                            const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0);
                            setFilters({
                                dateRange: {
                                    preset: 'custom',
                                    startDate: next.toISOString().split('T')[0],
                                    endDate: lastDay.toISOString().split('T')[0]
                                }
                            });
                        }}
                        className="p-2 rounded-xl hover:bg-gray-50 text-midblue transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Icon name="ChevronRightIcon" className="w-5 h-5 stroke-[3]" />
                    </button>
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <div className="flex justify-center mb-4">
                        <Icon name="InboxIcon" className="w-16 h-16 text-gray-300" />
                    </div>
                    <p className="font-bold">No transactions found</p>
                </div>
            ) : (
                <>
                    <div className="px-4 space-y-6">
                        {Object.entries(groupedTransactions).map(([date, items]) => (
                            <div key={date} className="space-y-3">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50 py-2 z-10">
                                    {date}
                                </h3>
                                <div className="space-y-2">
                                    {items.map((transaction) => {
                                        const category = getCategoryById(transaction.categoryId);
                                        return (
                                            <Card key={transaction.id} className="border-0 shadow-soft">
                                                <CardBody className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                                            transaction.type === "income" ? "bg-success-50" : "bg-danger-50"
                                                        }`}>
                                                            {category?.icon ? (
                                                                <Icon name={category.icon} className="w-6 h-6" style={{ color: category.color }} />
                                                            ) : (
                                                                <Icon name="CurrencyDollarIcon" className="w-6 h-6 text-gray-400" />
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
                                                        <p className={`font-black text-sm ${
                                                            transaction.type === "income" ? "text-success-600" : "text-danger-600"
                                                        }`}>
                                                            {transaction.type === "income" ? "+" : "-"}
                                                            {centsToDisplay(transaction.amount)}
                                                        </p>
                                                        <button
                                                            onClick={() => handleDelete(transaction.id!)}
                                                            className="p-1.5 rounded-xl hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition-all"
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
                </>
            )}
            {/* Month Picker Modal */}
            <Modal
                isOpen={isMonthPickerOpen}
                onClose={() => setIsMonthPickerOpen(false)}
                title="Select Month & Year"
            >
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
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
                                    const isSelected = new Date(filters.dateRange.startDate).getMonth() === i && 
                                                      new Date(filters.dateRange.startDate).getFullYear() === year;

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
        </div>
    );
};
