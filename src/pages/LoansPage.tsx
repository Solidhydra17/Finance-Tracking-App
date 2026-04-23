import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, TextArea, Button, Icon } from '@/components/ui';
import { useLoans } from '@/hooks';
import { useUIStore } from '@/store';
import { displayToCents, centsToDisplay } from '@/lib/money';
import type { LoanDirection } from '@/types';

export const LoansPage: React.FC = () => {
  const { loans, isLoading, createLoan, deleteLoan } = useLoans();
  const { isAddLoanOpen, setAddLoanOpen, addToast } = useUIStore();

  const [direction, setDirection] = useState<LoanDirection>('borrowed');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [principalDisplay, setPrincipalDisplay] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!counterpartyName || !principalDisplay || !termMonths) {
      addToast('warning', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const principal = displayToCents(principalDisplay);
      await createLoan({
        direction,
        counterpartyName,
        principal,
        interestRate: Number(interestRate) || 0,
        termMonths: Number(termMonths),
        startDate,
        notes,
      });
      setAddLoanOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCounterpartyName('');
    setPrincipalDisplay('');
    setInterestRate('');
    setTermMonths('');
    setNotes('');
  };

  return (
    <div id="page-loans" className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-midblue/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Icon name="WrenchScrewdriverIcon" className="w-12 h-12 text-midblue" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Under Construction</h1>
      <p className="text-gray-500 max-w-[280px] font-medium">
        We're building something great for your loans! Check back soon.
      </p>
    </div>
  );
};
