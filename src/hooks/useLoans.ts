import { useState, useEffect, useCallback } from 'react';
import { loansEngine } from '@/domain/loans/loansEngine';
import type { Loan, LoanCreate, LoanInstallment, LoanPayment } from '@/types';
import { useUIStore } from '@/store';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadLoans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await loansEngine.getAll();
      setLoans(data);
    } catch (error) {
      console.error('Failed to load loans:', error);
      addToast('error', 'Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const createLoan = useCallback(
    async (data: LoanCreate) => {
      try {
        await loansEngine.create(data);
        addToast('success', 'Loan created successfully');
        await loadLoans();
        return true;
      } catch (error) {
        console.error('Failed to create loan:', error);
        addToast('error', 'Failed to create loan');
        return false;
      }
    },
    [addToast, loadLoans]
  );

  const updateLoan = useCallback(
    async (id: number, data: Partial<Loan>) => {
      try {
        await loansEngine.update(id, data);
        addToast('success', 'Loan updated successfully');
        await loadLoans();
        return true;
      } catch (error) {
        console.error('Failed to update loan:', error);
        addToast('error', 'Failed to update loan');
        return false;
      }
    },
    [addToast, loadLoans]
  );

  const deleteLoan = useCallback(
    async (id: number) => {
      try {
        await loansEngine.delete(id);
        addToast('success', 'Loan deleted');
        await loadLoans();
        return true;
      } catch (error) {
        console.error('Failed to delete loan:', error);
        addToast('error', 'Failed to delete loan');
        return false;
      }
    },
    [addToast, loadLoans]
  );

  const getInstallmentSchedule = useCallback((loan: Loan) => {
    return loansEngine.generateInstallmentSchedule(loan);
  }, []);

  return {
    loans,
    isLoading,
    createLoan,
    updateLoan,
    deleteLoan,
    getInstallmentSchedule,
    refetch: loadLoans,
  };
}

export function useLoanDetails(loanId: number) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  const loadLoanDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const loanData = await loansEngine.getById(loanId);
      if (loanData) {
        setLoan(loanData);
        const schedule = loansEngine.generateInstallmentSchedule(loanData);
        setInstallments(schedule);
        const loanPayments = await loansEngine.getPayments(loanId);
        setPayments(loanPayments);
        const paid = await loansEngine.getTotalPaid(loanId);
        setTotalPaid(paid);
      }
    } catch (error) {
      console.error('Failed to load loan details:', error);
      addToast('error', 'Failed to load loan details');
    } finally {
      setIsLoading(false);
    }
  }, [loanId, addToast]);

  useEffect(() => {
    loadLoanDetails();
  }, [loadLoanDetails]);

  const addPayment = useCallback(
    async (amount: number, date: string) => {
      try {
        await loansEngine.addPayment(loanId, amount, date);
        addToast('success', 'Payment recorded');
        await loadLoanDetails();
        return true;
      } catch (error) {
        console.error('Failed to add payment:', error);
        addToast('error', 'Failed to record payment');
        return false;
      }
    },
    [loanId, addToast, loadLoanDetails]
  );

  const remainingBalance = loan
    ? loansEngine.calculateRemainingBalance(loan, totalPaid)
    : 0;

  return {
    loan,
    payments,
    installments,
    totalPaid,
    remainingBalance,
    isLoading,
    addPayment,
    refetch: loadLoanDetails,
  };
}
