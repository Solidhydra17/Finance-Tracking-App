import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, TextArea, Button, Icon, Modal } from '@/components/ui';
import { useCategories, useTransactions } from '@/hooks';
import { useUIStore } from '@/store';
import { displayToCents } from '@/lib/money';
import type { TransactionType } from '@/types';

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as TransactionType) || 'expense';

  const editId = searchParams.get('edit');
  const mode = searchParams.get('mode');
  const ruleIdParam = searchParams.get('ruleId');
  const { categories } = useCategories('both');
  const { createTransaction, updateTransaction } = useTransactions(useUIStore.getState().filters);
  const { addToast } = useUIStore();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurringRuleId, setRecurringRuleId] = useState<number | null>(null);
  const [ruleFrequency, setRuleFrequency] = useState<string | null>(null);
  const [isConfiguringRecurring, setIsConfiguringRecurring] = useState(false);
  const [isConfirmRuleUpdateOpen, setIsConfirmRuleUpdateOpen] = useState(false);
  
  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch transaction data if in edit mode
  useEffect(() => {
    if (editId) {
      const fetchTransaction = async () => {
        // Handle virtual recurring transactions
        if (typeof editId === 'string' && editId.startsWith('recurring-')) {
          addToast('info', 'Individual recurring transactions cannot be edited directly.');
          navigate('/transactions');
          return;
        }

        try {
          const { transactionsEngine } = await import('@/domain/transactions/transactionsEngine');
          const transaction = await transactionsEngine.getById(Number(editId));
          if (transaction) {
            setType(transaction.type);
            setAmountDisplay((transaction.amount / 100).toString());
            setDate(transaction.date);
            setCategoryId(transaction.categoryId);
            setNote(transaction.note);
            if (transaction.recurringRuleId) {
              setRecurringRuleId(transaction.recurringRuleId);
              setIsRecurring(true);
              const { recurringRepository } = await import('@/storage/indexeddb');
              const rule = await recurringRepository.getById(transaction.recurringRuleId);
              if (rule) {
                setRuleFrequency(rule.frequency);
                setFrequency(rule.frequency);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch transaction for editing:', error);
          addToast('error', 'Failed to load transaction data');
        }
      };
      fetchTransaction();
    }
  }, [editId, addToast]);

  // Fetch recurring rule data if in config mode from settings
  useEffect(() => {
    if (mode === 'config' && ruleIdParam) {
      const fetchRule = async () => {
        try {
          setIsConfiguringRecurring(true);
          setRecurringRuleId(Number(ruleIdParam));
          
          const { recurringRepository } = await import('@/storage/indexeddb');
          const rule = await recurringRepository.getById(Number(ruleIdParam));
          
          if (rule) {
            setType(rule.type);
            setAmountDisplay((rule.amount / 100).toString());
            setCategoryId(rule.categoryId);
            setNote(rule.description);
            setFrequency(rule.frequency);
            setRuleFrequency(rule.frequency);
            setIsRecurring(true);
          }
        } catch (error) {
          console.error('Failed to fetch rule for configuring:', error);
          addToast('error', 'Failed to load recurring settings');
        }
      };
      fetchRule();
    }
  }, [mode, ruleIdParam, addToast]);

  // Update type if query param changes (only if not in edit mode)
  useEffect(() => {
    if (!editId) {
      const queryType = searchParams.get('type') as TransactionType;
      if (queryType && (queryType === 'income' || queryType === 'expense')) {
        setType(queryType);
      }
    }
  }, [searchParams, editId]);

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

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('monthly');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('--- Submission Started ---');
    console.log('Values:', { amountDisplay, categoryId, type, date, note });

    try {
      if (!amountDisplay) {
        addToast('warning', 'Please enter an amount');
        return;
      }

      if (!categoryId || categoryId === 0) {
        addToast('warning', 'Please select a category');
        return;
      }

      const amount = displayToCents(amountDisplay);
      if (amount <= 0) {
        addToast('warning', 'Amount must be greater than zero');
        return;
      }

      setIsSubmitting(true);
      console.log('Creating transaction...', { type, amount, date, categoryId });

      let success = false;
      if (editId) {
        success = await updateTransaction(Number(editId), {
          type,
          amount,
          date,
          categoryId,
          note,
        });
      } else if (isRecurring) {
        const { recurringRepository } = await import('@/storage/indexeddb');
        const startDate = new Date(date);
        await recurringRepository.create({
          type,
          amount,
          categoryId,
          frequency,
          dayOfWeek: (frequency === 'weekly' || frequency === 'bi-weekly') ? startDate.getDay() : null,
          dayOfMonth: frequency === 'monthly' ? startDate.getDate() : null,
          startDate: date,
          endDate: null,
          description: note || 'Recurring Transaction',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);
        addToast('success', 'Recurring rule created successfully');
        success = true;
      } else {
        success = await createTransaction({
          type,
          amount,
          date,
          categoryId,
          note,
          source: 'manual',
        });
      }

      console.log('Submission result:', success);
      if (success) {
        navigate('/transactions');
      }
    } catch (error: any) {
      console.error('CRITICAL: Submission failed:', error);
      addToast('error', `Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const { refetch: refetchCategories } = useCategories('both');

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      addToast('warning', 'Please enter a category name');
      return;
    }

    try {
      const { categoryRepository } = await import('@/storage/indexeddb');
      await categoryRepository.create({
        name: newCategoryName,
        type: type,
        color: newCategoryColor,
        icon: 'TagIcon', // Default icon for custom categories
        isCustom: true
      });
      
      await refetchCategories();
      addToast('success', 'Category added');
      setIsAddingCategory(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Failed to add category:', error);
      addToast('error', 'Failed to add category');
    }
  };

  return (
    <div id="page-add-transaction" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header id="add-transaction-header" className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Icon name="ArrowLeftIcon" className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {editId ? 'Edit' : 'Add'} {type === 'income' ? 'Income' : 'Expense'}
          {isConfiguringRecurring && <span className="block text-[10px] text-midblue font-black uppercase tracking-widest mt-0.5">(Configuring recurring settings)</span>}
        </h1>
      </header>

      <div id="add-transaction-content" className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div id="section-toggle" className="flex bg-white p-1 rounded-2xl shadow-sm">
            <button
              type="button"
              disabled={isConfiguringRecurring}
              onClick={() => setType('income')}
              className={`
                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                ${type === 'income'
                  ? 'bg-success-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-600'
                }
                ${isConfiguringRecurring && type !== 'income' ? 'opacity-30' : ''}
              `}
            >
              Income
            </button>
            <button
              type="button"
              disabled={isConfiguringRecurring}
              onClick={() => setType('expense')}
              className={`
                flex-1 py-3 rounded-xl font-bold transition-all duration-300
                ${type === 'expense'
                  ? 'bg-danger-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-600'
                }
                ${isConfiguringRecurring && type !== 'expense' ? 'opacity-30' : ''}
              `}
            >
              Expense
            </button>
          </div>

          <div id="section-form-fields" className="bg-white rounded-3xl p-6 shadow-soft space-y-6 border border-gray-100">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
              leftIcon={<Icon name="BanknotesIcon" className="w-6 h-6 text-gray-400" />}
              required
              className="text-3xl font-bold text-gray-900"
            />

            <div className="flex gap-4">
                <div className="flex-1">
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        disabled={isConfiguringRecurring}
                        className={`text-lg ${isConfiguringRecurring ? 'opacity-50' : ''}`}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-sm font-bold text-gray-500 ml-1">Recurring</label>
                    <button
                        type="button"
                        onClick={() => !recurringRuleId && !isConfiguringRecurring && setIsRecurring(!isRecurring)}
                        disabled={!!recurringRuleId || isConfiguringRecurring}
                        className={`w-full h-[48px] rounded-2xl flex items-center justify-center font-bold transition-all ${
                            isRecurring ? 'bg-midblue text-white shadow-md' : 'bg-gray-100 text-gray-500'
                        } ${(!!recurringRuleId || isConfiguringRecurring) ? 'opacity-70 cursor-not-allowed shadow-none' : ''}`}
                    >
                        {isRecurring ? 'YES' : 'NO'}
                    </button>
                </div>
            </div>

            {isRecurring && (
                <div id="field-frequency" className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
                    <label className="text-sm font-bold text-gray-500 ml-1">Frequency</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFrequency('weekly')}
                            disabled={!!recurringRuleId && !isConfiguringRecurring}
                            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold border-2 transition-all ${
                                frequency === 'weekly' ? 'border-midblue bg-midblue/5 text-midblue' : 'border-transparent bg-gray-50 text-gray-400'
                            } ${(!!recurringRuleId && !isConfiguringRecurring) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Weekly
                        </button>
                        <button
                            type="button"
                            onClick={() => setFrequency('bi-weekly')}
                            disabled={!!recurringRuleId && !isConfiguringRecurring}
                            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold border-2 transition-all ${
                                frequency === 'bi-weekly' ? 'border-midblue bg-midblue/5 text-midblue' : 'border-transparent bg-gray-50 text-gray-400'
                            } ${(!!recurringRuleId && !isConfiguringRecurring) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Every 2 Weeks
                        </button>
                        <button
                            type="button"
                            onClick={() => setFrequency('monthly')}
                            disabled={!!recurringRuleId && !isConfiguringRecurring}
                            className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold border-2 transition-all ${
                                frequency === 'monthly' ? 'border-midblue bg-midblue/5 text-midblue' : 'border-transparent bg-gray-50 text-gray-400'
                            } ${(!!recurringRuleId && !isConfiguringRecurring) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Category Picker Trigger */}
            <div id="field-category" className="space-y-2">
              <label className="text-sm font-bold text-gray-500 ml-1">Category</label>
              <button
                type="button"
                disabled={isConfiguringRecurring}
                onClick={() => {
                    setIsAddingCategory(false);
                    setIsCategoryPickerOpen(true);
                }}
                id="btn-category-picker-open"
                className={`w-full flex items-center justify-between p-4 bg-gray-50 border-2 border-transparent hover:border-midblue/20 rounded-2xl transition-all ${isConfiguringRecurring ? 'opacity-50 cursor-not-allowed' : ''}`}
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

            <div id="field-note" className="space-y-1">
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

            {recurringRuleId && !isConfiguringRecurring && (
              <div id="section-recurring-link" className="pt-2 border-t border-gray-50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsConfiguringRecurring(true)}
                  className="w-full text-midblue font-bold flex items-center justify-center gap-2 py-3 bg-midblue/5 rounded-2xl"
                >
                  Configure recurring settings
                </Button>
              </div>
            )}
          </div>

          {!isConfiguringRecurring ? (
            <Button
              type="submit"
              isLoading={isSubmitting}
              id="btn-save-transaction"
              className={`w-full py-5 text-xl font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${type === 'income' ? 'bg-success-500 hover:bg-success-600' : 'bg-danger-500 hover:bg-danger-600'
                }`}
            >
              {editId ? 'Update' : 'Save'} {type === 'income' ? 'Income' : 'Expense'}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
               <Button
                type="button"
                onClick={() => setIsConfirmRuleUpdateOpen(true)}
                isLoading={isSubmitting}
                className="w-full py-4 text-lg bg-midblue text-white shadow-lg rounded-2xl"
              >
                Update recurring settings
              </Button>
              <button
                type="button"
                onClick={() => setIsConfiguringRecurring(false)}
                className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Rule Update Confirmation Modal */}
      <Modal
        isOpen={isConfirmRuleUpdateOpen}
        onClose={() => setIsConfirmRuleUpdateOpen(false)}
        title="Confirm Rule Update"
        size="sm"
        position="bottom"
      >
        <div className="space-y-6 pt-2 pb-6 px-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-midblue/10 rounded-full flex items-center justify-center">
              <Icon name="ArrowPathIcon" className="w-8 h-8 text-midblue" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Update recurring settings?</p>
              <p className="text-gray-500 text-sm mt-1">
                Your changes will only apply to future transactions. 
                <span className="block mt-1 font-bold text-midblue">Past history will remain unchanged.</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsConfirmRuleUpdateOpen(false)}
              className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setIsConfirmRuleUpdateOpen(false);
                setIsSubmitting(true);
                try {
                  const { recurringRepository } = await import('@/storage/indexeddb');
                  const amount = displayToCents(amountDisplay);
                  await recurringRepository.update(recurringRuleId!, {
                    amount,
                    frequency,
                    description: note
                  });
                  addToast('success', 'Recurring settings updated');
                  setIsConfiguringRecurring(false);
                  navigate('/settings?tab=recurring#section-recurring-settings');
                } catch (error) {
                  addToast('error', 'Failed to update rule');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="flex-1 py-4 rounded-2xl bg-midblue text-white font-bold hover:bg-midblue/90 shadow-lg shadow-midblue/20 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Picker Bottom Sheet */}
      <Modal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title={isAddingCategory ? "Create New Category" : `Select ${type === 'income' ? 'Income' : 'Expense'} Category`}
        position="bottom"
        size="lg"
      >
        <div id="modal-category-picker-content" className="space-y-4 max-h-[70vh] flex flex-col pb-6">
          {!isAddingCategory ? (
            <>
              <div className="px-1 flex gap-2">
                <div className="flex-1">
                    <Input
                        placeholder="Search category..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        leftIcon={<Icon name="MagnifyingGlassIcon" className="w-5 h-5 text-gray-400" />}
                        className="bg-gray-100 border-none"
                    />
                </div>
                <button
                    onClick={() => setIsAddingCategory(true)}
                    className="px-4 bg-midblue/10 text-midblue rounded-xl font-bold text-sm whitespace-nowrap active:scale-95 transition-all"
                >
                    + Add
                </button>
              </div>

              <div id="category-grid-container" className="flex-1 overflow-y-auto pr-1">
                <div id="category-grid" className="grid grid-cols-3 py-3 gap-3">
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
            </>
          ) : (
            <div id="add-category-form" className="space-y-6 pt-2">
                <div className="space-y-4">
                    <Input
                        label="Category Name"
                        placeholder="e.g. Netflix, Gym, etc."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                    />
                    
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 ml-1">Choose Color</label>
                        <div className="flex flex-wrap gap-3">
                            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#78716c'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setNewCategoryColor(color)}
                                    className={`w-10 h-10 rounded-full transition-all active:scale-90 ${newCategoryColor === color ? 'ring-4 ring-offset-2 ring-gray-200' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsAddingCategory(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddCategory}
                        className="flex-1 bg-midblue text-white"
                    >
                        Save Category
                    </Button>
                </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
