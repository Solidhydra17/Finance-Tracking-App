import React, { useState, useEffect } from 'react';
import { Select, Input, TextArea, Button } from '@/components/ui';
import { useCategories } from '@/hooks';
import { useTransactions } from '@/hooks';
import { useUIStore } from '@/store';
import { displayToCents, centsToDisplay } from '@/lib/money';
import type { TransactionType } from '@/types';

interface AddTransactionModalProps {
  onClose: () => void;
  editTransaction?: {
    id: number;
    type: TransactionType;
    amount: number;
    date: string;
    categoryId: number;
    note: string;
  };
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  onClose,
  editTransaction,
}) => {
  const { categories } = useCategories('both');
  const { createTransaction, updateTransaction } = useTransactions(useUIStore.getState().filters);
  const { addToast } = useUIStore();

  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const [amountDisplay, setAmountDisplay] = useState(
    editTransaction ? centsToDisplay(editTransaction.amount) : ''
  );
  const [date, setDate] = useState(editTransaction?.date || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number>(editTransaction?.categoryId || 0);
  const [note, setNote] = useState(editTransaction?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountDisplay || !categoryId) {
      addToast('warning', 'Please fill in all required fields');
      return;
    }

    const amount = displayToCents(amountDisplay);
    if (amount <= 0) {
      addToast('warning', 'Amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, {
          type,
          amount,
          date,
          categoryId,
          note,
        });
      } else {
        await createTransaction({
          type,
          amount,
          date,
          categoryId,
          note,
          source: 'manual',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('income')}
          className={`
            flex-1 py-3 rounded-xl font-medium transition-all
            ${
              type === 'income'
                ? 'bg-success-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`
            flex-1 py-3 rounded-xl font-medium transition-all
            ${
              type === 'expense'
                ? 'bg-danger-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          Expense
        </button>
      </div>

      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amountDisplay}
        onChange={(e) => setAmountDisplay(e.target.value)}
        leftIcon="$"
        required
      />

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(Number(e.target.value))}
        options={[
          { value: 0, label: 'Select category...' },
          ...filteredCategories.map((c) => ({
            value: c.id!,
            label: `${c.icon} ${c.name}`,
          })),
        ]}
        required
      />

      <TextArea
        label="Note"
        placeholder="Add a note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {editTransaction ? 'Update Transaction' : 'Add Transaction'}
      </Button>
    </form>
  );
};
