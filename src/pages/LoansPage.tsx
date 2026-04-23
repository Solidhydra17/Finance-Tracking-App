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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="ArrowPathIcon" className="w-8 h-8 animate-spin text-midblue" />
      </div>
    );
  }

  return (
    <div id="page-loans" className="px-4 space-y-4">
      <header className="pt-4">
        <h1 className="text-3xl font-extrabold text-midblue tracking-wider">KURIPOT</h1>
      </header>
      <div id="loans-header" className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Loans</h2>
        <Button size="sm" onClick={() => setAddLoanOpen(true)}>
          + Add Loan
        </Button>
      </div>

      {loans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="flex justify-center mb-4">
            <Icon name="BanknotesIcon" className="w-16 h-16 text-gray-200" />
          </div>
          <p>No loans yet</p>
        </div>
      ) : (
        <div id="loans-list" className="space-y-3">
          {loans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-2xl shadow-soft p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon 
                    name={loan.direction === 'lent' ? 'ArrowUpCircleIcon' : 'ArrowDownCircleIcon'} 
                    className={`w-8 h-8 ${loan.direction === 'lent' ? 'text-midblue' : 'text-warning-500'}`}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {loan.counterpartyName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {loan.direction === 'lent' ? 'You lent' : 'You borrowed'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteLoan(loan.id!)}
                  className="p-2 text-gray-400 hover:text-danger-500"
                >
                  <Icon name="TrashIcon" className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Principal</p>
                  <p className="font-medium">
                    {centsToDisplay(loan.principal)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Interest Rate</p>
                  <p className="font-medium">{loan.interestRate}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Term</p>
                  <p className="font-medium">{loan.termMonths} months</p>
                </div>
                <div>
                  <p className="text-gray-500">Started</p>
                  <p className="font-medium">
                    {new Date(loan.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddLoanOpen}
        onClose={() => setAddLoanOpen(false)}
        title="Add Loan"
      >
        <form id="form-add-loan" onSubmit={handleSubmit} className="space-y-4">
          <div id="loan-type-toggle" className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('borrowed')}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${
                  direction === 'borrowed'
                    ? 'bg-warning-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              <Icon name="ArrowDownCircleIcon" className="w-5 h-5" /> Borrowed
            </button>
            <button
              type="button"
              onClick={() => setDirection('lent')}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${
                  direction === 'lent'
                    ? 'bg-midblue text-white'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              <Icon name="ArrowUpCircleIcon" className="w-5 h-5" /> Lent
            </button>
          </div>

          <Input
            label="Counterparty Name"
            placeholder="Who's involved?"
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            required
          />

          <Input
            label="Principal Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={principalDisplay}
            onChange={(e) => setPrincipalDisplay(e.target.value)}
            leftIcon={<Icon name="CurrencyDollarIcon" className="w-5 h-5 text-gray-400" />}
            required
          />

          <Input
            label="Interest Rate (%)"
            type="number"
            step="0.1"
            min="0"
            placeholder="0"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
          />

          <Input
            label="Term (Months)"
            type="number"
            min="1"
            placeholder="12"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
            required
          />

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <TextArea
            label="Notes"
            placeholder="Additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Create Loan
          </Button>
        </form>
      </Modal>
    </div>
  );
};
