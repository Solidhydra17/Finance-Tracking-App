import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, Input, TextArea, Button, Icon, Modal } from '@/components/ui';
import { useCategories, useTransactions } from '@/hooks';
import { useUIStore } from '@/store';
import { displayToCents, centsToDisplay } from '@/lib/money';
import type { TransactionType } from '@/types';

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as TransactionType) || 'expense';

  const { categories } = useCategories('both');
  const { createTransaction } = useTransactions(useUIStore.getState().filters);
  const { addToast } = useUIStore();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update type if query param changes (optional, but good for consistency)
  useEffect(() => {
    const queryType = searchParams.get('type') as TransactionType;
    if (queryType && (queryType === 'income' || queryType === 'expense')) {
      setType(queryType);
    }
  }, [searchParams]);

  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const filteredCategories = categories
    .filter((c) => c.type === type || c.type === 'both')
    .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleCategorySelect = (id: number) => {
    setCategoryId(id);
    setIsCategoryPickerOpen(false);
    setCategorySearch('');
  };

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
      await createTransaction({
        type,
        amount,
        date,
        categoryId,
        note,
        source: 'manual',
      });
      addToast('success', 'Transaction added successfully');
      navigate(-1);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      addToast('error', 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Icon name="ArrowLeftIcon" className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add {type === 'income' ? 'Income' : 'Expense'}</h1>
      </div>

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`
                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                ${type === 'income'
                  ? 'bg-success-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`
                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                ${type === 'expense'
                  ? 'bg-danger-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              Expense
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-soft space-y-6 border border-gray-100">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
              leftIcon={<Icon name="CurrencyDollarIcon" className="w-6 h-6 text-gray-400" />}
              required
              className="text-3xl font-bold text-gray-900"
            />

            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="text-lg"
            />

            {/* Custom Category Picker Trigger */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 ml-1">Category</label>
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 border-2 border-transparent hover:border-midblue/20 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3">
                  {selectedCategory ? (
                    <>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: selectedCategory.color }}
                      >
                        <Icon name={selectedCategory.icon} className="w-6 h-6" />
                      </div>
                      <span className="text-lg font-bold text-gray-900">{selectedCategory.name}</span>
                    </>
                  ) : (
                    <span className="text-lg text-gray-400 font-medium">Select a category...</span>
                  )}
                </div>
                <Icon name="ChevronRightIcon" className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-1">
              <TextArea
                label="Note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 150))}
                rows={3}
                maxLength={150}
                className="text-lg"
              />
              <div className={`
                text-right text-xs font-bold uppercase tracking-tighter transition-colors duration-300
                ${note.length === 150 ? 'text-danger-500' : note.length >= 130 ? 'text-amber-500' : 'text-gray-400'}
              `}>
                {note.length} / 150
              </div>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className={`w-full py-5 text-xl font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${type === 'income' ? 'bg-success-500 hover:bg-success-600' : 'bg-danger-500 hover:bg-danger-600'
              }`}
          >
            Save {type === 'income' ? 'Income' : 'Expense'}
          </Button>
        </form>
      </div>

      {/* Category Picker Bottom Sheet */}
      <Modal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title={`Select ${type === 'income' ? 'Income' : 'Expense'} Category`}
        position="bottom"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] flex flex-col">
          <div className="px-1">
            <Input
              placeholder="Search category..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              leftIcon={<Icon name="MagnifyingGlassIcon" className="w-5 h-5 text-gray-400" />}
              className="bg-gray-100 border-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            <div className="grid grid-cols-3 py-3 mx-1 gap-3">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id!)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-90
                    ${categoryId === category.id ? 'bg-midblue/10 ring-2 ring-midblue' : 'hover:bg-gray-50'}
                  `}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon name={category.icon} className="w-8 h-8" />
                  </div>
                  <span className={`text-[11px] font-bold text-center leading-tight ${categoryId === category.id ? 'text-midblue' : 'text-gray-600'}`}>
                    {category.name}
                  </span>
                </button>
              ))}
            </div>

            {filteredCategories.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <Icon name="FaceFrownIcon" className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No categories found</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
