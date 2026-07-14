import { useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import { loanRepository } from '@/storage/indexeddb/loanRepository';
import { db } from '@/storage/indexeddb/database';
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
      let allTransactions: any[] = [];
      
      if (filters.transactionType === 'loans') {
        const loans = await loanRepository.getAll();
        const loanPayments = await db.loanPayments.toArray();
        
        const mappedLoans = loans.map(loan => ({
            id: `loan_${loan.id}`,
            type: 'loan',
            amount: loan.amount,
            date: loan.acquiredDate,
            originalLoan: loan,
            categoryId: -1
        }));
        
        const mappedPayments = loanPayments.map(payment => {
            const loan = loans.find(l => l.id === payment.loanId);
            return {
                id: `loan_payment_${payment.id}`,
                type: 'loan_payment',
                amount: payment.amount,
                date: payment.paidDate,
                originalLoanPayment: payment,
                originalLoan: loan,
                categoryId: -1
            };
        });
        
        allTransactions = [...mappedLoans, ...mappedPayments]
          .filter(item => {
            if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
              return item.date >= filters.dateRange.startDate && item.date <= filters.dateRange.endDate;
            }
            return true;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
      } else {
        allTransactions = await transactionsEngine.getByFilters(filters);
      }
      
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
