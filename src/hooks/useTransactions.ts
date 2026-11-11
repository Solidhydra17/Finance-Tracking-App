import { useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { transactionsEngine } from '@/domain/transactions/transactionsEngine';
import { loanRepository } from '@/storage/indexeddb/loanRepository';
import { db } from '@/storage/indexeddb/database';
import type { TransactionCreate, TransactionUpdate, FilterState } from '@/types';
import { compareTransactionsNewestFirst } from '@/lib/date';
import { useUIStore, useTransactionStore } from '@/store';
import { paginateItems, type PaginationResult } from '@/lib/pagination';
import { refreshFinancialState } from '@/lib/financialState';
import { offerUndo } from '@/lib/undo';

const syncCashbackRules = async () => {
  const { materializeBankRules } = await import('@/domain/yield/materializer');
  await materializeBankRules();
};

export function useTransactions(filters: FilterState) {
  const { 
    transactions, setTransactions, 
    isLoading, setLoading, 
    totalTransactions, setTotal,
    currentPage, setPage,
    lastFilters, setLastFilters,
    refreshToken
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
    setLastFilters: state.setLastFilters,
    refreshToken: state.refreshToken
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
      
      // Loan principals (+ legacy payments without a linked transaction) for All / Loans
      if (filters.transactionType === 'all' || filters.transactionType === 'loans') {
        const loans = await loanRepository.getAll();
        const loanPayments = await db.loanPayments.toArray();
        
        const mappedLoans = loans.map(loan => ({
            id: `loan_${loan.id}`,
            type: 'loan',
            amount: loan.amount,
            date: loan.acquiredDate,
            time: loan.time ?? '00:00',
            createdAt: loan.createdAt,
            originalLoan: loan,
            categoryId: -1
        }));
        
        const mappedPayments = loanPayments
            .filter(payment => !(payment as any).transactionId)
            .map(payment => {
            const loan = loans.find(l => l.id === payment.loanId);
            return {
                id: `loan_payment_${payment.id}`,
                type: 'loan_payment',
                amount: payment.amount,
                date: payment.paidDate,
                time: payment.time ?? '00:00',
                walletAccountId: payment.walletAccountId,
                originalLoanPayment: payment,
                originalLoan: loan,
                categoryId: -1
            };
        });
        
        let loanItems = [...mappedLoans, ...mappedPayments]
          .filter(item => {
            if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
              return item.date >= filters.dateRange.startDate && item.date <= filters.dateRange.endDate;
            }
            return true;
          });

        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          loanItems = loanItems.filter(item => 
              (item.originalLoan?.personName?.toLowerCase() || '').includes(query) ||
              item.date.includes(query)
          );
        }

        allTransactions = [...allTransactions, ...loanItems];
      }

      // Real DB transactions:
      // - All / Income / Expense / Credit / Transfer: always
      // - Loans: repayment txs (source loan_payment) via getByFilters
      const engineTransactions = await transactionsEngine.getByFilters(filters);
      allTransactions = [...allTransactions, ...engineTransactions];

      allTransactions.sort(compareTransactionsNewestFirst);
      
      setTransactions(allTransactions);
      setTotal(allTransactions.length);
      setLastFilters(filters);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      addToast('error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters, refreshToken, setTransactions, setTotal, setLoading, setLastFilters, addToast]);

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
        await syncCashbackRules();
        await refreshFinancialState();
        await loadTransactions(true);
        addToast('success', 'Transaction added successfully');
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
        await syncCashbackRules();
        await refreshFinancialState();
        await loadTransactions(true);
        addToast('success', 'Transaction updated successfully');
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
    async (id: number | string) => {
      try {
        const restore = async () => {
          await syncCashbackRules();
          await refreshFinancialState();
          await loadTransactions(true);
        };

        if (typeof id === 'string') {
          if (id.startsWith('loan_payment_')) {
            const paymentId = parseInt(id.replace('loan_payment_', ''), 10);
            const payment = await db.loanPayments.get(paymentId);
            await db.loanPayments.delete(paymentId);
            if (payment) {
              offerUndo('Payment deleted', async () => {
                await db.loanPayments.add(payment);
                await restore();
              });
            }
          } else if (id.startsWith('loan_')) {
            const loanId = parseInt(id.replace('loan_', ''), 10);
            const loan = await loanRepository.getById(loanId);
            await loanRepository.delete(loanId);
            if (loan) {
              offerUndo('Loan deleted', async () => {
                await db.loans.add(loan);
                await restore();
              });
            }
          }
        } else {
          const tx = await db.transactions.get(id);
          const payment = tx?.source === 'loan_payment'
            ? await loanRepository.getPaymentByTransactionId(id)
            : undefined;
          const loan = payment ? await loanRepository.getById(payment.loanId) : undefined;
          const previousStatus = loan?.status;
          await transactionsEngine.softDelete(id);
          offerUndo('Transaction deleted', async () => {
            await db.transactions.update(id, { deletedAt: null });
            if (payment?.id && !(await db.loanPayments.get(payment.id))) {
              await db.loanPayments.add(payment);
            }
            if (loan?.id && previousStatus) {
              await loanRepository.update(loan.id, { status: previousStatus });
            }
            await restore();
          });
        }
        await syncCashbackRules();
        await refreshFinancialState();
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
