import React, { useState, useMemo } from 'react';
import { useBudget } from '@/hooks';
import { Input, Select, Button, Card, Icon, Modal } from '@/components/ui';
import { centsToDisplay, displayToCents } from '@/lib/money';
import type { BudgetItem } from '@/types';

export const BudgetPlanningPage: React.FC = () => {
  const { plan, items, isLoading, savePlan, createItem, updateItem, deleteItem } = useBudget();
  
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  // Salary Form State
  const [grossInput, setGrossInput] = useState('');
  const [netInput, setNetInput] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'semi-monthly'>('monthly');

  // Item Form State
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemType, setItemType] = useState<'expense' | 'savings' | 'installment'>('expense');

  const openSalaryModal = () => {
    setGrossInput(plan ? (plan.grossSalaryCents / 100).toString() : '');
    setNetInput(plan ? (plan.netSalaryCents / 100).toString() : '');
    setFrequency(plan ? plan.payFrequency : 'monthly');
    setIsSalaryModalOpen(true);
  };

  const handleSaveSalary = async () => {
    const gross = displayToCents(grossInput);
    const net = displayToCents(netInput);
    await savePlan({ grossSalaryCents: gross, netSalaryCents: net, payFrequency: frequency });
    setIsSalaryModalOpen(false);
  };

  const openItemModal = (item?: BudgetItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemAmount((item.amountCents / 100).toString());
      setItemType(item.type);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemAmount('');
      setItemType('expense');
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    const amount = displayToCents(itemAmount);
    if (!itemName || amount <= 0) return;

    if (editingItem && editingItem.id) {
      await updateItem(editingItem.id, { name: itemName, amountCents: amount, type: itemType });
    } else {
      await createItem({ name: itemName, amountCents: amount, type: itemType, active: true });
    }
    setIsItemModalOpen(false);
  };

  const toggleItemStatus = async (item: BudgetItem) => {
    if (!item.id) return;
    await updateItem(item.id, { active: !item.active });
  };

  const totalAllocated = useMemo(() => {
    return items.filter(i => i.active).reduce((sum, item) => sum + item.amountCents, 0);
  }, [items]);

  const netSalary = plan?.netSalaryCents || 0;
  const unassignedMoney = netSalary - totalAllocated;

  if (isLoading) {
    return <div className="p-4 flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div id="page-budget" className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <header>
        <h1 className="text-2xl font-extrabold text-midblue dark:text-white tracking-wider">Budget Planning</h1>
        <p className="text-sm text-[var(--text-muted)] font-bold mt-1">Plan your salary before you spend it.</p>
      </header>

      {/* Salary Setup Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Salary Setup</h2>
          <Button variant="ghost" size="sm" onClick={openSalaryModal}>
            <Icon name="PencilSquareIcon" className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <Card className="p-4 flex justify-between items-center bg-gradient-to-br from-midblue to-blue-600 border-none">
          <div>
            <p className="text-xs font-bold text-white/80 uppercase mb-1">Net Salary ({plan?.payFrequency === 'semi-monthly' ? 'Semi-Monthly' : 'Monthly'})</p>
            <p className="text-2xl font-black text-white">{centsToDisplay(netSalary)}</p>
          </div>
        </Card>
      </section>

      {/* Summary Section */}
      <section className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Allocated</p>
          <p className="text-lg font-black text-[var(--text-main)]">{centsToDisplay(totalAllocated)}</p>
        </Card>
        <Card className={`p-4 ${unassignedMoney < 0 ? 'border-danger-500 bg-danger-500/10' : ''}`}>
          <p className={`text-xs font-bold uppercase mb-1 ${unassignedMoney < 0 ? 'text-danger-500' : 'text-[var(--text-muted)]'}`}>Unassigned</p>
          <p className={`text-lg font-black ${unassignedMoney < 0 ? 'text-danger-500' : 'text-success-500'}`}>
            {centsToDisplay(unassignedMoney)}
          </p>
        </Card>
      </section>

      {/* Cutoff Allocation Section */}
      {plan?.payFrequency === 'semi-monthly' && (
        <section>
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Cutoff Breakdown</h2>
          <div className="flex gap-4">
            <Card className="p-4 flex-1 bg-[var(--item-bg)]">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Cutoff A</p>
              <p className="text-md font-black text-[var(--text-main)]">{centsToDisplay(Math.floor(netSalary / 2))}</p>
            </Card>
            <Card className="p-4 flex-1 bg-[var(--item-bg)]">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Cutoff B</p>
              <p className="text-md font-black text-[var(--text-main)]">{centsToDisplay(Math.ceil(netSalary / 2))}</p>
            </Card>
          </div>
        </section>
      )}

      {/* Potential Savings */}
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

      {/* Budget Items Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Budget Items</h2>
          <Button variant="primary" size="sm" onClick={() => openItemModal()}>
            <Icon name="PlusIcon" className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] italic text-sm">
            No budget items yet. Plan where your money goes!
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className={`p-3 flex items-center justify-between transition-opacity ${!item.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleItemStatus(item)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${item.active ? 'bg-midblue border-midblue text-white' : 'border-[var(--card-border)]'}`}
                  >
                    {item.active && <Icon name="CheckIcon" className="w-3 h-3" />}
                  </button>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">{item.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{item.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black text-[var(--text-main)]">{centsToDisplay(item.amountCents)}</p>
                  <button onClick={() => openItemModal(item)} className="p-1 text-[var(--text-muted)] hover:text-midblue">
                    <Icon name="PencilSquareIcon" className="w-4 h-4" />
                  </button>
                  <button onClick={() => item.id && deleteItem(item.id)} className="p-1 text-[var(--text-muted)] hover:text-danger-500">
                    <Icon name="TrashIcon" className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
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
          <Button className="w-full mt-4" onClick={handleSaveSalary}>Save Salary</Button>
        </div>
      </Modal>

      {/* Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem ? 'Edit Item' : 'Add Budget Item'} position="bottom">
        <div className="space-y-4">
          <Input 
            label="Item Name" 
            value={itemName} 
            onChange={(e) => setItemName(e.target.value)} 
            placeholder="e.g. Rent, Groceries"
          />
          <Input 
            label="Amount" 
            type="number" 
            value={itemAmount} 
            onChange={(e) => setItemAmount(e.target.value)} 
            placeholder="0.00"
            leftIcon={<span className="font-bold text-[var(--text-muted)]">₱</span>}
          />
          <Select 
            label="Type" 
            value={itemType} 
            onChange={(e) => setItemType(e.target.value as 'expense' | 'savings' | 'installment')}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'savings', label: 'Savings' },
              { value: 'installment', label: 'Installment' }
            ]}
          />
          <Button className="w-full mt-4" onClick={handleSaveItem}>Save Item</Button>
        </div>
      </Modal>
    </div>
  );
};
