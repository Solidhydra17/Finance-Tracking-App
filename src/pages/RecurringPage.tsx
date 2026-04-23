import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Button, Icon } from '@/components/ui';
import { useRecurring } from '@/hooks';
import { useUIStore } from '@/store';
import { displayToCents, centsToDisplay } from '@/lib/money';
import type { RecurringFrequency } from '@/types';

export const RecurringPage: React.FC = () => {
  const { rules, isLoading, createRule, deleteRule } = useRecurring();
  const { isAddRecurringOpen, setAddRecurringOpen, addToast } = useUIStore();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth] = useState<number>(1);
  const [dayOfWeek] = useState<number>(1);
  const [startDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountDisplay || !categoryId) {
      addToast('warning', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = displayToCents(amountDisplay);
      await createRule({
        type,
        amount,
        categoryId,
        frequency,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
        startDate,
        endDate: null,
        description,
      });
      setAddRecurringOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmountDisplay('');
    setCategoryId(0);
    setDescription('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="ArrowPathIcon" className="w-8 h-8 animate-spin text-midblue" />
      </div>
    );
  }

  return (
    <div id="page-recurring" className="px-4 space-y-4">
      <div id="recurring-header" className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Recurring</h1>
        <Button size="sm" onClick={() => setAddRecurringOpen(true)}>
          + Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="flex justify-center mb-4">
            <Icon name="ArrowPathIcon" className="w-16 h-16 text-gray-200" />
          </div>
          <p>No recurring rules yet</p>
        </div>
      ) : (
        <div id="recurring-rules-list" className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-2xl shadow-soft p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon name="ArrowPathIcon" className="w-6 h-6 text-midblue" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {rule.description || 'Recurring'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {rule.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteRule(rule.id!)}
                  className="p-2 text-gray-400 hover:text-danger-500"
                >
                  <Icon name="TrashIcon" className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium font-semibold">
                    {centsToDisplay(rule.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium">
                    {rule.type === 'income' ? 'Income' : 'Expense'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddRecurringOpen}
        onClose={() => setAddRecurringOpen(false)}
        title="Add Recurring Rule"
      >
        <form id="form-add-recurring" onSubmit={handleSubmit} className="space-y-4">
          <div id="recurring-type-toggle" className="flex gap-2">
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
            leftIcon={<Icon name="CurrencyDollarIcon" className="w-5 h-5 text-gray-400" />}
            required
          />

          <div id="recurring-frequency-toggle" className="flex gap-2">
            <button
              type="button"
              onClick={() => setFrequency('weekly')}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all
                ${
                  frequency === 'weekly'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setFrequency('monthly')}
              className={`
                flex-1 py-3 rounded-xl font-medium transition-all
                ${
                  frequency === 'monthly'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              Monthly
            </button>
          </div>

          <Input
            label="Description"
            placeholder="What's this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Create Rule
          </Button>
        </form>
      </Modal>
    </div>
  );
};
