import { useState, useEffect, useCallback, useMemo } from 'react';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import type { Transaction, TransactionCreate, TransactionUpdate, FilterState } from '@/types';
import { useUIStore } from '@/store';
import { paginateItems, createPaginationState, type PaginationResult } from '@/lib/pagination';

export function useTransactions(filters: FilterState) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationState, setPaginationState] = useState(createPaginationState(20));
  const { addToast } = useUIStore();

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTransactions = await transactionsEngine.getByFilters(filters);
      setTransactions(allTransactions);
      setPaginationState((prev) => ({ ...prev, total: allTransactions.length }));
    } catch (error) {
      console.error('Failed to load transactions:', error);
      addToast('error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const paginatedResult = useMemo<PaginationResult<Transaction>>(() => {
    return paginateItems(transactions, paginationState.page, paginationState.pageSize);
  }, [transactions, paginationState.page, paginationState.pageSize]);

  const createTransaction = useCallback(
    async (data: TransactionCreate) => {
      try {
        await transactionsEngine.create(data);
        addToast('success', 'Transaction added successfully');
        await loadTransactions();
        return true;
      } catch (error) {
        console.error('Failed to create transaction:', error);
        addToast('error', 'Failed to add transaction');
        return false;
      }
    },
    [addToast, loadTransactions]
  );

  const updateTransaction = useCallback(
    async (id: number, data: TransactionUpdate) => {
      try {
        await transactionsEngine.update(id, data);
        addToast('success', 'Transaction updated successfully');
        await loadTransactions();
        return true;
      } catch (error) {
        console.error('Failed to update transaction:', error);
        addToast('error', 'Failed to update transaction');
        return false;
      }
    },
    [addToast, loadTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: number) => {
      try {
        await transactionsEngine.softDelete(id);
        addToast('success', 'Transaction deleted');
        await loadTransactions();
        return true;
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        addToast('error', 'Failed to delete transaction');
        return false;
      }
    },
    [addToast, loadTransactions]
  );

  return {
    transactions: paginatedResult.items,
    pagination: paginatedResult.pagination,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    setPage: (page: number) =>
      setPaginationState((prev) => ({ ...prev, page })),
    refetch: loadTransactions,
  };
}
