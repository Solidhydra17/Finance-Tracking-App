import type { PaymentPlan } from '@/types';
import { formatDateLocal } from '@/lib/date';

const MONTHLY_HORIZON = 12;

export const addMonths = (date: Date, months: number) => {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

export const ordinal = (day: number) => {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
};

const parseDue = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const monthsBetween = (from: Date, to: Date) => (
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
);

export const nextDue = (plan: PaymentPlan, from = new Date()): Date | null => {
  const first = parseDue(plan.dueDate);
  if (!first) return null;
  const today = startOfDay(from);
  if (plan.repeatsMonthly) {
    if (first >= today) return first;
    const apart = monthsBetween(first, today);
    const thisMonth = addMonths(first, apart);
    return thisMonth >= today ? thisMonth : addMonths(first, apart + 1);
  }
  for (let month = 0; month < plan.months; month += 1) {
    const due = addMonths(first, month);
    if (due >= today) return due;
  }
  return null;
};

export const dueDates = (plan: PaymentPlan, from = new Date()): Date[] => {
  const first = parseDue(plan.dueDate);
  if (!first) return [];
  const today = startOfDay(from);
  if (!plan.repeatsMonthly) {
    const dues: Date[] = [];
    for (let month = 0; month < plan.months; month += 1) {
      const due = addMonths(first, month);
      if (due >= today) dues.push(due);
    }
    return dues;
  }
  const upcoming = nextDue(plan, from);
  if (!upcoming) return [];
  const startOffset = monthsBetween(first, upcoming);
  const dues: Date[] = [];
  for (let step = 0; step < MONTHLY_HORIZON; step += 1) {
    dues.push(addMonths(first, startOffset + step));
  }
  return dues;
};

export type BillTone = 'green' | 'amber' | 'red' | 'overdue';

export interface BillStatus {
  tone: BillTone;
  label: string;
  due: Date | null;
  daysLeft: number | null;
  showOnHome: boolean;
}

const dayDiff = (from: Date, to: Date) => {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86400000);
};

const occurrenceDates = (plan: PaymentPlan, today: Date) => {
  const first = parseDue(plan.dueDate);
  if (!first) return [];
  if (!plan.repeatsMonthly) {
    return Array.from({ length: Math.max(0, plan.months) }, (_, index) => addMonths(first, index));
  }
  const ahead = nextDue(plan, today) ?? addMonths(first, Math.max(0, monthsBetween(first, today)) + 1);
  const lastIndex = Math.max(0, monthsBetween(first, ahead));
  const dates: Date[] = [];
  for (let index = 0; index <= lastIndex; index += 1) dates.push(addMonths(first, index));
  return dates;
};

const focusDue = (plan: PaymentPlan, expenseDates: string[], today: Date) => {
  const occurrences = occurrenceDates(plan, today);
  if (occurrences.length === 0) return null;
  const paid = new Set<number>();
  const sorted = expenseDates.filter(Boolean).sort();
  for (const expenseDate of sorted) {
    for (let index = 0; index < occurrences.length; index += 1) {
      if (paid.has(index)) continue;
      const due = occurrences[index];
      const previous = formatDateLocal(addMonths(due, -1));
      const following = formatDateLocal(addMonths(due, 1));
      if (expenseDate > previous && expenseDate <= following) {
        paid.add(index);
        break;
      }
    }
  }
  const unpaid = occurrences.find((_, index) => !paid.has(index));
  if (unpaid) return unpaid;
  if (plan.repeatsMonthly) return addMonths(occurrences[occurrences.length - 1], 1);
  return null;
};

export const billStatus = (plan: PaymentPlan, expenseDates: string[] = [], from = new Date()): BillStatus => {
  const due = focusDue(plan, expenseDates, from);
  if (!due) {
    return { tone: 'green', label: 'Paid', due: null, daysLeft: null, showOnHome: false };
  }
  const daysLeft = dayDiff(from, due);
  const inWindow = daysLeft <= Math.max(0, plan.remindDaysBefore);
  if (daysLeft < 0) {
    const late = Math.abs(daysLeft);
    return {
      tone: 'overdue',
      label: late === 1 ? 'Overdue by 1 day' : `Overdue by ${late} days`,
      due,
      daysLeft,
      showOnHome: true,
    };
  }
  if (daysLeft <= 3) {
    const label = daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
    return { tone: 'red', label, due, daysLeft, showOnHome: inWindow };
  }
  if (inWindow) {
    return { tone: 'amber', label: `Due in ${daysLeft} days`, due, daysLeft, showOnHome: true };
  }
  return { tone: 'green', label: 'On track', due, daysLeft, showOnHome: false };
};
