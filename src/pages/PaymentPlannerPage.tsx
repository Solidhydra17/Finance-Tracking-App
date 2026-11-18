import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { Icon, Input, Modal, SwipeRow, AVAILABLE_ICONS } from '@/components/ui';
import { BillStatusPill } from '@/components/bills/BillStatusPill';
import { centsToDisplay, displayToCents } from '@/lib/money';
import { getCurrentLocalDate } from '@/lib/date';
import { billStatus, ordinal, type BillStatus } from '@/lib/paymentPlanSchedule';
import { requestNotificationPermission, schedulePaymentPlans } from '@/lib/notifications';
import { categoryRepository, isSystemCategoryName } from '@/storage/indexeddb/categoryRepository';
import { Capacitor } from '@capacitor/core';
import { paymentPlanRepository } from '@/storage';
import { db } from '@/storage/indexeddb/database';
import { useCategories } from '@/hooks';
import { useUIStore, useWalletStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { offerUndo } from '@/lib/undo';
import type { Category, PaymentPlan } from '@/types';

const deleteIcon = <HugeiconsIcon icon={Delete02Icon} size={20} />;

const reminderCopy = (days: number) => (
  days === 0 ? 'Reminds you on the due date' : `Reminds you ${days} day${days === 1 ? '' : 's'} before`
);

type BillSwipeRowProps = {
  name: string;
  amountLabel: string;
  schedule: string;
  reminder: string;
  darkMode: boolean;
  status?: BillStatus;
  onEdit: () => void;
  onDelete: () => void;
};

const BillSwipeRow = ({
  name,
  amountLabel,
  schedule,
  reminder,
  darkMode,
  status,
  onEdit,
  onDelete,
}: BillSwipeRowProps) => {
  const skipClick = useRef(false);

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    skipClick.current = true;
    window.setTimeout(() => {
      skipClick.current = false;
    }, 0);
  };

  const handleRowClick = () => {
    if (skipClick.current) return;
    onEdit();
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleRowClick();
  };

  return (
    <SwipeRow
      actions={[{ id: 'delete', label: 'Delete', icon: deleteIcon }]}
      onCommit={onDelete}
      onOpenChange={handleOpenChange}
      actionColor="#ef4444"
      drawerColor={darkMode ? '#1f2937' : '#e5e7eb'}
      rowColor={darkMode ? '#0a0a0a' : '#ffffff'}
      textColor={darkMode ? '#f8fafc' : '#111827'}
      height={120}
      radius={16}
      actionWidth={84}
      direction="left"
      label={name}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit ${name}`}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        className="flex h-full w-full min-w-0 flex-col justify-center gap-0.5 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-extrabold text-[var(--text-main)]">{name}</h2>
          {status && <BillStatusPill status={status} />}
        </div>
        <p className="text-sm font-black text-midblue dark:text-white">{amountLabel}</p>
        <p className="truncate text-xs font-medium text-[var(--text-muted)]">{schedule}</p>
        <p className="truncate text-xs font-medium text-[var(--text-muted)]">{reminder}</p>
      </div>
    </SwipeRow>
  );
};

const amountToInput = (cents: number) => (cents / 100).toFixed(2);

const accountPaymentLabel = (accountName: string) => `${accountName} Payment`;

const categoryChoice = (id: number) => `category-${id}`;

const accountChoice = (id: number) => `account-${id}`;

const isUncategorizedName = (name: string) => name.trim().toLowerCase() === 'uncategorized';

type ChoiceTile = {
  choice: string;
  name: string;
  color: string;
  icon: string;
  hint?: string;
};

const accountTile = (account: { id?: number; name: string; type: string }): ChoiceTile => ({
  choice: accountChoice(account.id!),
  name: accountPaymentLabel(account.name),
  color: account.type === 'loan' ? '#f97316' : '#64748b',
  icon: account.type === 'loan' ? 'HandRaisedIcon' : 'CreditCardIcon',
  hint: account.type === 'loan' ? 'Loan' : 'Credit',
});

const categoryTile = (category: Category): ChoiceTile => ({
  choice: categoryChoice(category.id!),
  name: category.name,
  color: category.color,
  icon: category.icon,
});

const ChoiceGrid = ({
  title,
  tiles,
  selection,
  onSelect,
}: {
  title: string;
  tiles: ChoiceTile[];
  selection: string;
  onSelect: (choice: string) => void;
}) => {
  if (tiles.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="px-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => {
          const selected = tile.choice === selection;
          return (
            <button
              key={tile.choice}
              type="button"
              aria-label={tile.name}
              aria-pressed={selected}
              onClick={() => onSelect(tile.choice)}
              className={`flex min-h-11 flex-col items-center gap-2 rounded-2xl p-3 transition-all active:scale-95 ${selected ? 'bg-midblue/10 ring-2 ring-midblue' : ''}`}
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ backgroundColor: tile.color }}
              >
                <Icon name={tile.icon} className="h-8 w-8" />
              </span>
              <span className={`text-center text-[11px] font-bold leading-tight ${selected ? 'text-midblue dark:text-white' : 'text-[var(--text-main)]'}`}>
                {tile.name}
              </span>
              {tile.hint && (
                <span className="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{tile.hint}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const PaymentPlannerPage = () => {
  const addToast = useUIStore((state) => state.addToast);
  const darkMode = useUIStore((state) => state.darkMode);
  const sheetOpen = useUIStore((state) => state.isPaymentPlanOpen);
  const setSheetOpen = useUIStore((state) => state.setPaymentPlanOpen);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<number, BillStatus>>({});
  const { categories, refetch: refetchCategories } = useCategories('both');
  const { accounts, fetchAccounts } = useWalletStore(useShallow((state) => ({
    accounts: state.accounts,
    fetchAccounts: state.fetchAccounts,
  })));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selection, setSelection] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getCurrentLocalDate());
  const [everyMonth, setEveryMonth] = useState(false);
  const [months, setMonths] = useState('6');
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [newCategoryIcon, setNewCategoryIcon] = useState(AVAILABLE_ICONS[0]);

  const load = async () => {
    const stored = await paymentPlanRepository.getAll();
    const nextStatuses: Record<number, BillStatus> = {};
    await Promise.all(stored.map(async (plan) => {
      if (!plan.id) return;
      nextStatuses[plan.id] = billStatus(plan, await paymentPlanRepository.paidDates(plan));
    }));
    setPlans(stored);
    setStatuses(nextStatuses);
    return stored;
  };

  useEffect(() => {
    load().catch(() => addToast('error', 'Could not load payment plans'));
    fetchAccounts().catch(() => undefined);
    return () => setSheetOpen(false);
  }, [addToast, fetchAccounts, setSheetOpen]);

  const namedCategories = useMemo(() => (
    categories.filter((category) => category.id && !isUncategorizedName(category.name))
  ), [categories]);

  const expenseCategories = useMemo(() => (
    namedCategories
      .filter((category) => category.type === 'expense' && !isSystemCategoryName(category.name))
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [namedCategories]);

  const incomeCategories = useMemo(() => (
    namedCategories
      .filter((category) => category.type === 'income' && !isSystemCategoryName(category.name))
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [namedCategories]);

  const payableAccounts = useMemo(() => (
    accounts
      .filter((account) => account.id && (account.type === 'credit' || account.type === 'loan'))
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [accounts]);

  const search = categorySearch.trim().toLowerCase();
  const matchesSearch = (name: string) => name.toLowerCase().includes(search);
  const accountTiles = payableAccounts.map(accountTile);
  const expenseTiles = expenseCategories.map(categoryTile);
  const incomeTiles = incomeCategories.map(categoryTile);
  const visibleDefaults = accountTiles.filter((tile) => matchesSearch(tile.name));
  const visibleExpenses = expenseTiles.filter((tile) => matchesSearch(tile.name));
  const visibleIncome = incomeTiles.filter((tile) => matchesSearch(tile.name));
  const selectedTile = [...accountTiles, ...expenseTiles, ...incomeTiles].find((tile) => tile.choice === selection);

  const resetForm = () => {
    setEditingId(null);
    setSelection('');
    setAmount('');
    setDueDate(getCurrentLocalDate());
    setEveryMonth(false);
    setMonths('6');
    setRemindDaysBefore('3');
    setPickerOpen(false);
    setCategorySearch('');
    setIsAddingCategory(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setSheetOpen(true);
  };

  const handleOpenEdit = (plan: PaymentPlan) => {
    if (!plan.id) return;
    setEditingId(plan.id);
    if (plan.walletAccountId) setSelection(accountChoice(plan.walletAccountId));
    else if (plan.categoryId) setSelection(categoryChoice(plan.categoryId));
    else setSelection('');
    setAmount(amountToInput(plan.amount));
    setDueDate(plan.dueDate);
    setEveryMonth(plan.repeatsMonthly === true);
    setMonths(String(plan.months));
    setRemindDaysBefore(String(plan.remindDaysBefore));
    setSheetOpen(true);
  };

  const handleClose = () => {
    setPickerOpen(false);
    setSheetOpen(false);
  };

  const handleOpenPicker = () => {
    setCategorySearch('');
    setIsAddingCategory(false);
    setPickerOpen(true);
    fetchAccounts().catch(() => undefined);
  };

  const handlePick = (choice: string) => {
    setSelection(choice);
    setPickerOpen(false);
    setCategorySearch('');
    setIsAddingCategory(false);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      addToast('warning', 'Please enter a category name');
      return;
    }
    if (isUncategorizedName(trimmed) || isSystemCategoryName(trimmed)) {
      addToast('warning', 'Please choose a specific category name');
      return;
    }
    try {
      const id = await categoryRepository.create({
        name: trimmed,
        type: 'expense',
        color: newCategoryColor,
        icon: newCategoryIcon,
        isCustom: true,
      });
      await refetchCategories();
      setSelection(categoryChoice(id));
      setNewCategoryName('');
      setNewCategoryColor('#3b82f6');
      setNewCategoryIcon(AVAILABLE_ICONS[0]);
      setIsAddingCategory(false);
      setPickerOpen(false);
      addToast('success', 'Category added');
    } catch {
      addToast('error', 'Failed to add category');
    }
  };

  const handleSave = async () => {
    const monthCount = Number(months);
    const lead = Number(remindDaysBefore);
    const selectedAccount = payableAccounts.find((account) => accountChoice(account.id!) === selection);
    const selectedCategory = [...expenseCategories, ...incomeCategories]
      .find((category) => categoryChoice(category.id!) === selection);
    if (!selectedAccount && !selectedCategory) {
      addToast('warning', 'Choose a category, credit card, or loan');
      return;
    }
    if (!amount.trim() || displayToCents(amount) <= 0) {
      addToast('warning', 'Add the amount to pay');
      return;
    }
    if (!dueDate) {
      addToast('warning', 'Choose the due date');
      return;
    }
    if (!everyMonth && (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 24)) {
      addToast('warning', 'Months should be between 1 and 24');
      return;
    }
    if (!Number.isInteger(lead) || lead < 0 || lead > 30) {
      addToast('warning', 'Reminder days should be between 0 and 30');
      return;
    }
    const alreadyUsed = plans.some((plan) => {
      if (plan.id === editingId) return false;
      if (selectedAccount) return plan.walletAccountId === selectedAccount.id;
      return !plan.walletAccountId && plan.categoryId === selectedCategory?.id;
    });
    if (alreadyUsed) {
      addToast('warning', 'That choice already has a bill');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: selectedAccount ? accountPaymentLabel(selectedAccount.name) : selectedCategory!.name,
        amount: displayToCents(amount),
        dueDate,
        months: everyMonth ? (Number.isInteger(monthCount) && monthCount > 0 ? monthCount : 6) : monthCount,
        repeatsMonthly: everyMonth,
        remindDaysBefore: lead,
        categoryId: selectedAccount ? undefined : selectedCategory!.id,
        walletAccountId: selectedAccount?.id,
        enabled: true,
      };

      if (editingId) {
        await paymentPlanRepository.update(editingId, payload);
      } else {
        await paymentPlanRepository.create(payload);
      }
      const stored = await load();
      setSheetOpen(false);
      resetForm();

      const permissionAlreadyKnown = Capacitor.isNativePlatform() || (typeof Notification !== 'undefined' && Notification.permission !== 'default');
      if (!permissionAlreadyKnown) {
        requestNotificationPermission()
          .then((allowed) => (allowed ? schedulePaymentPlans(stored) : undefined))
          .catch(() => undefined);
        addToast('success', editingId ? 'Bill updated. Allow notifications to get reminders.' : 'Bill saved. Allow notifications to get reminders.');
        return;
      }

      const allowed = await requestNotificationPermission();
      await schedulePaymentPlans(stored);
      addToast('success', allowed ? 'Reminders are set.' : 'Saved. Allow notifications to get reminders.');
    } catch {
      addToast('error', 'Could not save this bill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const plan = await db.paymentPlans.get(id);
    await paymentPlanRepository.delete(id);
    const stored = await load();
    await schedulePaymentPlans(stored);
    if (editingId === id) {
      setSheetOpen(false);
      resetForm();
    }
    if (!plan) return;
    offerUndo('Bill removed', async () => {
      await db.paymentPlans.add(plan);
      const next = await load();
      await schedulePaymentPlans(next);
    });
  };

  return (
    <div className="space-y-5 px-4 pb-8 pt-4">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to home" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-main)]">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-2xl font-extrabold text-midblue dark:text-white">Payment Planner</h1>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="min-h-11 shrink-0 rounded-2xl px-1 text-sm font-extrabold text-midblue"
          >
            Add +
          </button>
        </div>
        <p className="pl-14 text-xs font-medium text-[var(--text-muted)]">Bills to pay, with a reminder before each due date.</p>
      </header>

      <section className="space-y-3">
        {plans.length === 0 && (
          <p className="rounded-3xl border border-dashed border-[var(--card-border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No bills yet. Tap Add + to set one up.
          </p>
        )}
        {[...plans].sort((a, b) => {
          const left = a.id ? statuses[a.id]?.daysLeft ?? 9999 : 9999;
          const right = b.id ? statuses[b.id]?.daysLeft ?? 9999 : 9999;
          return left - right;
        }).map((plan) => {
          const status = plan.id ? statuses[plan.id] : undefined;
          const dueLabel = status?.due?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timing = !dueLabel
            ? 'All payments in this plan have passed'
            : status?.tone === 'overdue'
              ? `Missed ${dueLabel}`
              : `Next due ${dueLabel}`;
          const schedule = plan.repeatsMonthly
            ? `Every month on the ${ordinal(new Date(`${plan.dueDate}T00:00:00`).getDate())}`
            : `${plan.months} month${plan.months === 1 ? '' : 's'} from ${new Date(`${plan.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          return (
            <BillSwipeRow
              key={plan.id}
              name={plan.name}
              amountLabel={centsToDisplay(plan.amount)}
              schedule={`${schedule} · ${timing}`}
              reminder={reminderCopy(plan.remindDaysBefore)}
              darkMode={darkMode}
              status={status}
              onEdit={() => handleOpenEdit(plan)}
              onDelete={() => {
                if (plan.id) handleDelete(plan.id);
              }}
            />
          );
        })}
      </section>

      <Modal
        isOpen={sheetOpen}
        onClose={() => {
          if (pickerOpen) return;
          handleClose();
        }}
        title={editingId ? 'Edit bill' : 'Add bill'}
        position="bottom"
        size="md"
      >
        <form
          className="space-y-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <div className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">What this bill follows</span>
            <button
              type="button"
              onClick={handleOpenPicker}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-left"
            >
              {selectedTile ? (
                <>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: selectedTile.color }}
                  >
                    <Icon name={selectedTile.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate text-sm font-bold text-[var(--text-main)]">{selectedTile.name}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-[var(--text-muted)]">Choose a category, credit card, or loan</span>
              )}
            </button>
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              Each credit card and loan in this wallet is its own choice, such as Maribank Payment. A payment only clears that account.
            </span>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Amount</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)] outline-none"
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4">
            <input
              type="checkbox"
              checked={everyMonth}
              onChange={(event) => setEveryMonth(event.target.checked)}
              className="h-5 w-5 accent-midblue"
            />
            <span className="text-sm font-bold text-[var(--text-main)]">Every month</span>
          </label>
          <div className={everyMonth ? '' : 'grid grid-cols-2 gap-3'}>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-3 text-sm font-bold text-[var(--text-main)] outline-none"
              />
              {everyMonth && dueDate && (
                <span className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {`Due on the ${ordinal(new Date(`${dueDate}T00:00:00`).getDate())} of every month.`}
                </span>
              )}
            </label>
            {!everyMonth && (
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Months</span>
                <input
                  inputMode="numeric"
                  value={months}
                  onChange={(event) => setMonths(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)] outline-none"
                />
              </label>
            )}
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Remind me this many days before</span>
            <input
              inputMode="numeric"
              value={remindDaysBefore}
              onChange={(event) => setRemindDaysBefore(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)] outline-none"
            />
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">Use 0 to be reminded on the due date.</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 w-full rounded-2xl bg-midblue text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save bill'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => handleDelete(editingId)}
              className="min-h-12 w-full rounded-2xl text-sm font-bold text-danger-500"
            >
              Remove bill
            </button>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setIsAddingCategory(false);
        }}
        title={isAddingCategory ? 'Create New Category' : 'Select Category'}
        position="bottom"
        size="lg"
        scrollBody
      >
        <div className="flex flex-col space-y-4 pb-6">
          {!isAddingCategory ? (
            <>
              <div className="flex gap-2 px-1">
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    leftIcon={<Icon name="MagnifyingGlassIcon" className="h-5 w-5 text-[var(--text-muted)]" />}
                    className="border-none bg-[var(--item-bg)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="whitespace-nowrap rounded-xl bg-midblue/10 px-4 text-sm font-bold text-midblue active:scale-95"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-4 pr-1">
                <ChoiceGrid title="Defaults" tiles={visibleDefaults} selection={selection} onSelect={handlePick} />
                <ChoiceGrid title="Expense" tiles={visibleExpenses} selection={selection} onSelect={handlePick} />
                <ChoiceGrid title="Income" tiles={visibleIncome} selection={selection} onSelect={handlePick} />
                {visibleDefaults.length === 0 && visibleExpenses.length === 0 && visibleIncome.length === 0 && (
                  <div className="py-12 text-center font-medium text-[var(--text-muted)]">
                    <Icon name="FaceFrownIcon" className="mx-auto mb-2 h-12 w-12 opacity-20" />
                    <p>No categories found</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6 pt-2">
              <Input
                label="Category Name"
                placeholder="e.g. Netflix, Gym, etc."
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                autoFocus
              />
              <div className="space-y-2">
                <span className="ml-1 text-sm font-bold text-[var(--text-muted)]">Choose Color</span>
                <div className="flex flex-wrap gap-3">
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#78716c'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Color ${color}`}
                      onClick={() => setNewCategoryColor(color)}
                      className={`h-10 w-10 rounded-full active:scale-90 ${newCategoryColor === color ? 'ring-4 ring-[var(--card-border)] ring-offset-2' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="ml-1 text-sm font-bold text-[var(--text-muted)]">Choose Icon</span>
                <div className="grid max-h-[200px] grid-cols-6 gap-3 overflow-y-auto p-1">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      aria-label={iconName}
                      onClick={() => setNewCategoryIcon(iconName)}
                      className={`flex h-11 items-center justify-center rounded-xl ${newCategoryIcon === iconName ? 'bg-midblue text-white' : 'bg-[var(--item-bg)] text-[var(--text-main)]'}`}
                    >
                      <Icon name={iconName} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="min-h-12 flex-1 rounded-2xl text-sm font-bold text-[var(--text-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="min-h-12 flex-1 rounded-2xl bg-midblue text-sm font-bold text-white"
                >
                  Save category
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
