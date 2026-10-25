import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui';
import { centsToDisplay, displayToCents } from '@/lib/money';
import { getCurrentLocalDate } from '@/lib/date';
import { requestNotificationPermission, schedulePaymentPlans } from '@/lib/notifications';
import { Capacitor } from '@capacitor/core';
import { paymentPlanRepository } from '@/storage';
import { useUIStore } from '@/store';
import type { PaymentPlan } from '@/types';

const addMonths = (date: Date, months: number) => {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

const nextDue = (plan: PaymentPlan) => {
  const first = new Date(`${plan.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let month = 0; month < plan.months; month += 1) {
    const due = addMonths(first, month);
    if (due >= today) return due;
  }
  return null;
};

const reminderCopy = (days: number) => (
  days === 0 ? 'Reminds you on the due date' : `Reminds you ${days} day${days === 1 ? '' : 's'} before`
);

const amountToInput = (cents: number) => (cents / 100).toFixed(2);

export const PaymentPlannerPage = () => {
  const addToast = useUIStore((state) => state.addToast);
  const sheetOpen = useUIStore((state) => state.isPaymentPlanOpen);
  const setSheetOpen = useUIStore((state) => state.setPaymentPlanOpen);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getCurrentLocalDate());
  const [months, setMonths] = useState('6');
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const stored = await paymentPlanRepository.getAll();
    setPlans(stored);
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
    if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 24) {
      addToast('warning', 'Months should be between 1 and 24');
      return;
    }
    if (!Number.isInteger(lead) || lead < 0 || lead > 30) {
      addToast('warning', 'Reminder days should be between 0 and 30');
      return;
    }

    const payload = {
      name: billName,
      amount: displayToCents(amount),
      dueDate,
      months: monthCount,
      remindDaysBefore: lead,
      enabled: true,
    };

    setSaving(true);
    try {
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
    await paymentPlanRepository.delete(id);
    const stored = await load();
    await schedulePaymentPlans(stored);
    if (editingId === id) {
      setSheetOpen(false);
      resetForm();
    }
    addToast('info', 'Bill removed');
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
        {plans.map((plan) => {
          const upcoming = nextDue(plan);
          return (
            <article key={plan.id} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(plan)}
                  className="min-h-11 flex-1 rounded-2xl text-left"
                  aria-label={`Edit ${plan.name}`}
                >
                  <h2 className="text-base font-extrabold text-[var(--text-main)]">{plan.name}</h2>
                  <p className="text-sm font-black text-midblue dark:text-white">{centsToDisplay(plan.amount)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => plan.id && handleDelete(plan.id)}
                  className="min-h-11 rounded-xl px-3 text-xs font-bold text-danger-500"
                >
                  Remove
                </button>
              </div>
              <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                {`${upcoming ? `Next due ${upcoming.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'All payments in this plan have passed'} · ${plan.months} month${plan.months === 1 ? '' : 's'} from ${new Date(`${plan.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
              <p className="text-xs font-medium text-[var(--text-muted)]">{reminderCopy(plan.remindDaysBefore)}</p>
            </article>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-3 text-sm font-bold text-[var(--text-main)] outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Months</span>
              <input
                inputMode="numeric"
                value={months}
                onChange={(event) => setMonths(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] px-4 text-sm font-bold text-[var(--text-main)] outline-none"
              />
            </label>
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
