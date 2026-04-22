import React, { useState, useMemo } from "react";
import {
    Card,
    CardBody,
    Badge,
    Button,
    Pagination,
    Input,
} from "@/components/ui";
import { FilterBar, FilterChip } from "@/components/layout";
import { useTransactions, useCategories } from "@/hooks";
import { useUIStore } from "@/store";
import { centsToDisplay } from "@/lib/money";
import type { TransactionTypeFilter } from "@/types";

export const TransactionsPage: React.FC = () => {
    const { filters, setFilters } = useUIStore();
    const { categories } = useCategories("both");
    const { transactions, pagination, isLoading, deleteTransaction, setPage } =
        useTransactions(filters);
    const [searchTerm, setSearchTerm] = useState("");

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-3xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="px-4">
                <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={handleSearch}
                    leftIcon="🔍"
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

            {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-4">📭</p>
                    <p>No transactions found</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2 px-4">
                        {transactions.map((transaction) => {
                            const category = getCategoryById(
                                transaction.categoryId,
                            );
                            return (
                                <Card key={transaction.id}>
                                    <CardBody className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                                                    transaction.type ===
                                                    "income"
                                                        ? "bg-success-100"
                                                        : "bg-danger-100"
                                                }`}
                                            >
                                                {category?.icon || "💰"}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {category?.name ||
                                                        "Unknown"}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {transaction.note ||
                                                        "No note"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={`font-semibold ${
                                                    transaction.type ===
                                                    "income"
                                                        ? "text-success-600"
                                                        : "text-danger-600"
                                                }`}
                                            >
                                                {transaction.type === "income"
                                                    ? "+"
                                                    : "-"}
                                                {centsToDisplay(
                                                    transaction.amount,
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(
                                                    transaction.date,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                handleDelete(transaction.id!)
                                            }
                                            className="ml-2 p-2 text-gray-400 hover:text-danger-500 transition-colors"
                                        >
                                            🗑️
                                        </button>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>

                    <Pagination
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
};
