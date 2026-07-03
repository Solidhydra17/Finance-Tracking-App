import { useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import type { TransactionCreate, TransactionUpdate, FilterState } from '@/types';
import { useUIStore, useTransactionStore } from '@/store';
import { paginateItems, type PaginationResult } from '@/lib/pagination';

export function useTransactions(filters: FilterState) {
  const { 
    transactions, setTransactions, 
    isLoading, setLoading, 
    totalTransactions, setTotal,
    currentPage, setPage,
    lastFilters, setLastFilters
  } = useTransactionStore(useShallow(state => ({
    transactions: state.transactions,
    setTransactions: state.setTransactions,
    isLoading: state.isLoading,
    setLoading: state.setLoading,
    totalTransactions: state.totalTransactions,
    setTotal: state.setTotal,
    currentPage: state.currentPage,
    setPage: state.setPage,
    lastFilters: state.lastFilters,
    setLastFilters: state.setLastFilters
  })));
  
  const addToast = useUIStore(state => state.addToast);

  const loadTransactions = useCallback(async (forceLoading = false) => {
    // Only show loading if forced or if filters changed or if we have no data
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(lastFilters);
    
    if (forceLoading || filtersChanged || transactions.length === 0) {
      setLoading(true);
    }
    
    try {
      const allTransactions = await transactionsEngine.getByFilters(filters);
      setTransactions(allTransactions);
      setTotal(allTransactions.length);
      setLastFilters(filters);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      addToast('error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters, setTransactions, setTotal, setLoading, setLastFilters, addToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const paginatedResult = useMemo<PaginationResult<any>>(() => {
    return paginateItems(transactions, currentPage, 20); // Fixed page size for now
  }, [transactions, currentPage]);

  const createTransaction = useCallback(
    async (data: TransactionCreate) => {
      try {
        await transactionsEngine.create(data);
        addToast('success', 'Transaction added successfully');
        await loadTransactions(true);
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
        await loadTransactions(true);
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
        await loadTransactions(true);
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
    pagination: {
      page: currentPage,
      pageSize: 20,
      total: totalTransactions
    },
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    setPage,
    refetch: () => loadTransactions(true),
  };
}
