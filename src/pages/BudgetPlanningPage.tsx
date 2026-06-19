import React, { useState, useMemo, useEffect } from 'react';
import { useBudget, useCategories } from '@/hooks';
import { Input, Select, Button, Card, Icon, Modal } from '@/components/ui';
import { DonutChart } from '@/components/charts';
import { centsToDisplay, displayToCents } from '@/lib/money';
import { budgetEngine, type PlannedVsActual } from '@/domain/budget/budgetEngine';
import type { BudgetItem, BudgetItemType, BudgetItemFrequency } from '@/types';
import { categoryRepository } from '@/storage/indexeddb';

export const BudgetPlanningPage: React.FC = () => {
  const { plan, items, isLoading, savePlan, createItem, updateItem, deleteItem } = useBudget();
  const { categories, refetch: refetchCategories } = useCategories('expense'); // only expense categories used in budget for now
  
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  // Salary Form State
  const [grossInput, setGrossInput] = useState('');
  const [netInput, setNetInput] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'semi-monthly'>('monthly');
  const [workDays, setWorkDays] = useState('5');

  // Item Form State
  const [itemName, setItemName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemFrequency, setItemFrequency] = useState<BudgetItemFrequency>('month');
  const [useWorkSchedule, setUseWorkSchedule] = useState(false);
  const [itemType, setItemType] = useState<BudgetItemType>('expense');
  const [newCategoryName, setNewCategoryName] = useState(''); // If user selects "new"

  // Simulator State
  const [simName, setSimName] = useState('');
  const [simAmount, setSimAmount] = useState('');

  // Planned vs Actual State
  const [pva, setPva] = useState<Map<number, PlannedVsActual>>(new Map());

  const workDaysPerWeek = plan?.workDaysPerWeek || 5;

  useEffect(() => {
    if (!isLoading && items.length > 0) {
      budgetEngine.getPlannedVsActual(items, workDaysPerWeek).then(setPva);
    }
  }, [items, workDaysPerWeek, isLoading]);

  const openSalaryModal = () => {
    setGrossInput(plan ? (plan.grossSalaryCents / 100).toString() : '');
    setNetInput(plan ? (plan.netSalaryCents / 100).toString() : '');
    setFrequency(plan ? plan.payFrequency : 'monthly');
    setWorkDays(plan?.workDaysPerWeek ? plan.workDaysPerWeek.toString() : '5');
    setIsSalaryModalOpen(true);
  };

  const handleSaveSalary = async () => {
    const gross = displayToCents(grossInput);
    const net = displayToCents(netInput);
    const wd = parseInt(workDays, 10) || 5;
    await savePlan({ grossSalaryCents: gross, netSalaryCents: net, payFrequency: frequency, workDaysPerWeek: wd });
    setIsSalaryModalOpen(false);
  };

  const openItemModal = (item?: BudgetItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setCategoryId(item.categoryId ? item.categoryId.toString() : '');
      setItemAmount((item.amountCents / 100).toString());
      setItemFrequency(item.frequency || 'month');
      setUseWorkSchedule(item.useWorkSchedule || false);
      setItemType(item.type || 'expense');
    } else {
      setEditingItem(null);
      setItemName('');
      setCategoryId('');
      setItemAmount('');
      setItemFrequency('month');
      setUseWorkSchedule(false);
      setItemType('expense');
    }
    setNewCategoryName('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    const amount = displayToCents(itemAmount);
    if (amount <= 0) return;

    let finalCategoryId: number | undefined = categoryId === 'new' ? undefined : (categoryId ? parseInt(categoryId, 10) : undefined);
    let finalName = itemName;

    // Handle new shared category creation
    if (itemType === 'expense') {
      if (categoryId === 'new' && newCategoryName) {
        finalCategoryId = await categoryRepository.create({
          name: newCategoryName,
          type: 'expense',
          color: '#3b82f6', // Default blue
          icon: 'TagIcon',
          isCustom: true
        });
        await refetchCategories();
        finalName = newCategoryName;
      } else if (finalCategoryId) {
        const cat = categories.find(c => c.id === finalCategoryId);
        if (cat) finalName = cat.name;
      }
    }

    if (!finalName) return; // name is required

    const data = {
      name: finalName,
      categoryId: finalCategoryId,
      amountCents: amount,
      frequency: itemFrequency,
      useWorkSchedule: useWorkSchedule,
      type: itemType,
      active: editingItem ? editingItem.active : true,
    };

    if (editingItem && editingItem.id) {
      await updateItem(editingItem.id, data);
    } else {
      await createItem(data);
    }
    setIsItemModalOpen(false);
  };

  const toggleItemStatus = async (item: BudgetItem) => {
    if (!item.id) return;
    await updateItem(item.id, { active: !item.active });
  };

  const netSalary = plan?.netSalaryCents || 0;
  
  // Calculations
  const totalAllocated = useMemo(() => budgetEngine.calculateAllocated(items, workDaysPerWeek), [items, workDaysPerWeek]);
  const unassignedMoney = netSalary - totalAllocated;
  const financialHealth = budgetEngine.calculateFinancialHealth(netSalary, totalAllocated);

  const compositionData = useMemo(() => {
    let exp = 0; let sav = 0; let inst = 0;
    items.filter(i => i.active).forEach(i => {
      const m = budgetEngine.calculateMonthlyAmount(i, workDaysPerWeek);
      if (i.type === 'expense') exp += m;
      else if (i.type === 'savings') sav += m;
      else if (i.type === 'installment') inst += m;
    });
    return [
      { label: 'Expenses', value: exp, color: '#f43f5e' },
      { label: 'Savings', value: sav, color: '#10b981' },
      { label: 'Installments', value: inst, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [items, workDaysPerWeek]);

  // Purchase Simulator
  const simulatedAmount = displayToCents(simAmount);
  const remainingAfterSim = unassignedMoney - simulatedAmount;

  if (isLoading) {
    return <div className="p-4 flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div id="page-budget" className="px-4 py-6 space-y-8 max-w-lg mx-auto">
      <header>
        <h1 className="text-2xl font-extrabold text-midblue dark:text-white tracking-wider">Budget Planning</h1>
        <p className="text-sm text-[var(--text-muted)] font-bold mt-1">Plan your salary before you spend it.</p>
      </header>

      {/* 1. Salary Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Salary Summary</h2>
          <Button variant="ghost" size="sm" onClick={openSalaryModal}>
            <Icon name="PencilSquareIcon" className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>
        <Card className="p-4 bg-gradient-to-br from-midblue to-blue-600 border-none">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-white/80 uppercase mb-1">Net Salary ({plan?.payFrequency === 'semi-monthly' ? 'Semi-Monthly' : 'Monthly'})</p>
              <p className="text-3xl font-black text-white">{centsToDisplay(netSalary)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white/80 uppercase mb-1">{plan?.workDaysPerWeek || 5} days/week</p>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Financial Health */}
      <section className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Allocated</p>
          <p className="text-sm font-black text-[var(--text-main)]">{centsToDisplay(totalAllocated)}</p>
        </Card>
        <Card className={`p-3 text-center ${unassignedMoney < 0 ? 'bg-danger-500/10 border-danger-500/30' : ''}`}>
          <p className={`text-[10px] font-bold uppercase mb-1 ${unassignedMoney < 0 ? 'text-danger-500' : 'text-[var(--text-muted)]'}`}>Remaining</p>
          <p className={`text-sm font-black ${unassignedMoney < 0 ? 'text-danger-500' : 'text-success-500'}`}>
            {centsToDisplay(unassignedMoney)}
          </p>
        </Card>
        <Card className={`p-3 flex flex-col items-center justify-center ${
            financialHealth === 'Healthy' ? 'bg-success-500/10 border-success-500/30' : 
            financialHealth === 'Tight' ? 'bg-warning-500/10 border-warning-500/30' : 'bg-danger-500/10 border-danger-500/30'
          }`}>
          <p className={`text-[10px] font-bold uppercase mb-1 ${
            financialHealth === 'Healthy' ? 'text-success-600' : 
            financialHealth === 'Tight' ? 'text-warning-600' : 'text-danger-600'
          }`}>Health</p>
          <p className={`text-sm font-black ${
            financialHealth === 'Healthy' ? 'text-success-700' : 
            financialHealth === 'Tight' ? 'text-warning-700' : 'text-danger-700'
          }`}>{financialHealth}</p>
        </Card>
      </section>

      {/* 3. Budget Composition Chart */}
      {compositionData.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Budget Composition</h2>
          <Card className="p-6">
            <DonutChart data={compositionData} size={220} />
          </Card>
        </section>
      )}

      {/* 4. Budget Items */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Budget Items</h2>
          <Button variant="primary" size="sm" onClick={() => openItemModal()}>
            <Icon name="PlusIcon" className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] italic text-sm">
            No budget items yet. Plan where your money goes!
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const monthlyCents = budgetEngine.calculateMonthlyAmount(item, workDaysPerWeek);
              const percentage = netSalary > 0 ? ((monthlyCents / netSalary) * 100).toFixed(1) : 0;
              const itemPva = item.id ? pva.get(item.id) : null;

              return (
                <Card key={item.id} className={`p-3 transition-opacity ${!item.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleItemStatus(item)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${item.active ? 'bg-midblue border-midblue text-white' : 'border-[var(--card-border)]'}`}
                      >
                        {item.active && <Icon name="CheckIcon" className="w-3 h-3" />}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                          {item.name}
                          <span className="text-[9px] font-black bg-[var(--bg-color)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                            {item.type}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          {centsToDisplay(item.amountCents)} / {item.frequency} {item.frequency === 'day' && item.useWorkSchedule ? '(Work Days)' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openItemModal(item)} className="p-1 text-[var(--text-muted)] hover:text-midblue">
                        <Icon name="PencilSquareIcon" className="w-4 h-4" />
                      </button>
                      <button onClick={() => item.id && deleteItem(item.id)} className="p-1 text-[var(--text-muted)] hover:text-danger-500">
                        <Icon name="TrashIcon" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pl-8 flex justify-between items-end border-t border-[var(--card-border)] pt-2 mt-2">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Monthly Eq.</p>
                      <p className="text-sm font-black text-[var(--text-main)]">{centsToDisplay(monthlyCents)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Alloc.</p>
                      <p className="text-sm font-black text-[var(--text-main)]">{percentage}%</p>
                    </div>
                  </div>

                  {/* Planned vs Actual display for Expenses */}
                  {item.active && item.type === 'expense' && itemPva && (
                    <div className="pl-8 mt-2 pt-2 border-t border-[var(--card-border)]/50 text-[10px] flex justify-between">
                      <span className="font-bold text-[var(--text-muted)] uppercase">Actual: {centsToDisplay(itemPva.actualCents)}</span>
                      <span className={`font-bold uppercase ${itemPva.isOverBudget ? 'text-danger-500' : 'text-success-500'}`}>
                        {itemPva.isOverBudget ? 'Over Budget: ' : 'Under Budget: '} {centsToDisplay(itemPva.differenceCents)}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Cutoff Breakdown */}
      {plan?.payFrequency === 'semi-monthly' && (
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Cutoff Breakdown</h2>
          <div className="flex gap-3">
            <Card className="p-4 flex-1 bg-[var(--item-bg)] text-center border-l-4 border-l-blue-500">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">1st Cutoff Free</p>
              <p className="text-md font-black text-[var(--text-main)]">{centsToDisplay(Math.floor(unassignedMoney / 2))}</p>
            </Card>
            <Card className="p-4 flex-1 bg-[var(--item-bg)] text-center border-l-4 border-l-blue-500">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">2nd Cutoff Free</p>
              <p className="text-md font-black text-[var(--text-main)]">{centsToDisplay(Math.ceil(unassignedMoney / 2))}</p>
            </Card>
          </div>
        </section>
      )}

      {/* 6. Potential Savings */}
      {unassignedMoney > 0 && (
        <section>
          <Card className="p-4 bg-success-500/10 border-success-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
                <Icon name="BanknotesIcon" className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-success-600 uppercase">Potential Yearly Savings</p>
                <p className="text-lg font-black text-success-700">{centsToDisplay(unassignedMoney * 12)}</p>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* 7. Purchase Simulator */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Purchase Simulator</h2>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-4">See how a new monthly payment affects your remaining budget.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Input 
              placeholder="e.g. New Phone" 
              value={simName} 
              onChange={e => setSimName(e.target.value)} 
            />
            <Input 
              type="number" 
              placeholder="0.00/mo" 
              value={simAmount} 
              onChange={e => setSimAmount(e.target.value)} 
              leftIcon={<span className="font-bold text-[var(--text-muted)]">₱</span>}
            />
          </div>
          {simAmount && simulatedAmount > 0 && (
            <div className={`p-3 rounded-xl border ${remainingAfterSim < 0 ? 'bg-danger-500/10 border-danger-500/30 text-danger-700' : 'bg-success-500/10 border-success-500/30 text-success-700'}`}>
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Remaining after {simName || 'purchase'}:</span>
                <span className="text-lg font-black">{centsToDisplay(remainingAfterSim)}</span>
              </div>
              {remainingAfterSim < 0 && (
                <p className="text-[10px] uppercase mt-1">This purchase will put you in a budget deficit!</p>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Salary Modal */}
      <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title="Salary Setup" position="bottom">
        <div className="space-y-4">
          <Input 
            label="Gross Salary" 
            type="number" 
            value={grossInput} 
            onChange={(e) => setGrossInput(e.target.value)} 
            placeholder="0.00"
            leftIcon={<span className="font-bold text-[var(--text-muted)]">₱</span>}
          />
          <Input 
            label="Net Salary" 
            type="number" 
            value={netInput} 
            onChange={(e) => setNetInput(e.target.value)} 
            placeholder="0.00"
            leftIcon={<span className="font-bold text-[var(--text-muted)]">₱</span>}
          />
          <Select 
            label="Pay Frequency" 
            value={frequency} 
            onChange={(e) => setFrequency(e.target.value as 'monthly' | 'semi-monthly')}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'semi-monthly', label: 'Semi-Monthly (15th & 30th)' }
            ]}
          />
          <Input 
            label="Work Days Per Week" 
            type="number" 
            value={workDays} 
            onChange={(e) => setWorkDays(e.target.value)} 
            placeholder="5"
          />
          <Button className="w-full mt-4" onClick={handleSaveSalary}>Save Salary</Button>
        </div>
      </Modal>

      {/* Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add Budget Item'} position="bottom">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-4">
          <Select 
            label="Type" 
            value={itemType} 
            onChange={(e) => setItemType(e.target.value as BudgetItemType)}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'savings', label: 'Savings' },
              { value: 'installment', label: 'Installment' }
            ]}
          />

          {itemType === 'expense' ? (
            <>
              <Select 
                label="Category" 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)}
                options={[
                  { value: '', label: 'Select a category...' },
                  ...categories.map(c => ({ value: c.id!.toString(), label: c.name })),
                  { value: 'new', label: '+ Create New Category' }
                ]}
              />
              {categoryId === 'new' && (
                <Input 
                  label="New Category Name" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  placeholder="e.g. Groceries"
                />
              )}
            </>
          ) : (
            <Input 
              label="Item Name" 
              value={itemName} 
              onChange={(e) => setItemName(e.target.value)} 
              placeholder={itemType === 'savings' ? 'e.g. Emergency Fund' : 'e.g. Car Loan'}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Amount" 
              type="number" 
              value={itemAmount} 
              onChange={(e) => setItemAmount(e.target.value)} 
              placeholder="0.00"
              leftIcon={<span className="font-bold text-[var(--text-muted)]">₱</span>}
            />
            <Select 
              label="Frequency" 
              value={itemFrequency} 
              onChange={(e) => setItemFrequency(e.target.value as BudgetItemFrequency)}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'biweekly', label: 'Bi-Weekly' },
                { value: 'month', label: 'Monthly' }
              ]}
            />
          </div>

          {itemFrequency === 'day' && (
            <div className="flex items-center gap-3 mt-2 p-3 bg-[var(--item-bg)] rounded-xl border border-[var(--card-border)]">
              <button 
                onClick={() => setUseWorkSchedule(!useWorkSchedule)}
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${useWorkSchedule ? 'bg-midblue border-midblue text-white' : 'border-[var(--text-muted)]'}`}
              >
                {useWorkSchedule && <Icon name="CheckIcon" className="w-3 h-3" />}
              </button>
              <div className="text-xs">
                <p className="font-bold text-[var(--text-main)]">Use Work Schedule</p>
                <p className="text-[var(--text-muted)]">Only calculate for {workDays} days per week instead of every day.</p>
              </div>
            </div>
          )}

          <Button className="w-full mt-4" onClick={handleSaveItem}>Save Item</Button>
        </div>
      </Modal>
    </div>
  );
};
