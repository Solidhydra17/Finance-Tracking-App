import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { Modal, SwipeRow } from '@/components/ui';
import { BillStatusPill } from '@/components/bills/BillStatusPill';
import { centsToDisplay, displayToCents } from '@/lib/money';
import { getCurrentLocalDate } from '@/lib/date';
import { billStatus, ordinal, type BillStatus } from '@/lib/paymentPlanSchedule';
import { requestNotificationPermission, schedulePaymentPlans } from '@/lib/notifications';
import { ensureBillCategory } from '@/storage/indexeddb/categoryRepository';
import { Capacitor } from '@capacitor/core';
import { paymentPlanRepository } from '@/storage';
import { WalletSwitcher } from '@/components/wallets/WalletSwitcher';
import { db } from '@/storage/indexeddb/database';
import { useUIStore } from '@/store';
import { offerUndo } from '@/lib/undo';
import type { PaymentPlan } from '@/types';

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

export const PaymentPlannerPage = () => {
  const addToast = useUIStore((state) => state.addToast);
  const darkMode = useUIStore((state) => state.darkMode);
  const sheetOpen = useUIStore((state) => state.isPaymentPlanOpen);
  const setSheetOpen = useUIStore((state) => state.setPaymentPlanOpen);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<number, BillStatus>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getCurrentLocalDate());
  const [everyMonth, setEveryMonth] = useState(false);
  const [months, setMonths] = useState('6');
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const stored = await paymentPlanRepository.getAll();
    const nextStatuses: Record<number, BillStatus> = {};
    await Promise.all(stored.map(async (plan) => {
      if (!plan.id) return;
      nextStatuses[plan.id] = billStatus(plan, await paymentPlanRepository.expenseDates(plan.categoryId));
    }));
    setPlans(stored);
    setStatuses(nextStatuses);
    return stored;
  };

  useEffect(() => {
    load().catch(() => addToast('error', 'Could not load payment plans'));
    return () => setSheetOpen(false);
  }, [addToast, setSheetOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setDueDate(getCurrentLocalDate());
    setEveryMonth(false);
    setMonths('6');
    setRemindDaysBefore('3');
  };

  const handleOpenAdd = () => {
    resetForm();
    setSheetOpen(true);
  };

  const handleOpenEdit = (plan: PaymentPlan) => {
    if (!plan.id) return;
    setEditingId(plan.id);
    setName(plan.name);
    setAmount(amountToInput(plan.amount));
    setDueDate(plan.dueDate);
    setEveryMonth(plan.repeatsMonthly === true);
    setMonths(String(plan.months));
    setRemindDaysBefore(String(plan.remindDaysBefore));
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
  };

  const handleSave = async () => {
    const billName = name.trim();
    const monthCount = Number(months);
    const lead = Number(remindDaysBefore);
    if (!billName) {
      addToast('warning', 'Add a name for this bill');
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

    setSaving(true);
    try {
      const categoryId = await ensureBillCategory(billName, editingId
        ? plans.find((plan) => plan.id === editingId)?.categoryId
        : undefined);
      const payload = {
        name: billName,
        amount: displayToCents(amount),
        dueDate,
        months: everyMonth ? (Number.isInteger(monthCount) && monthCount > 0 ? monthCount : 6) : monthCount,
        repeatsMonthly: everyMonth,
        remindDaysBefore: lead,
        categoryId,
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
          <WalletSwitcher />
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
        onClose={handleClose}
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
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Bill</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rent, Meralco, tuition"
              className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)] outline-none"
            />
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              An expense category with this name is created. Log the payment there and an overdue bill clears.
            </span>
          </label>
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
    </div>
  );
};
