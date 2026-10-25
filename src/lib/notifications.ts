import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from '@/types/reminder';
import type { PaymentPlan } from '@/types/paymentPlan';
import { formatDateLocal } from '@/lib/date';

export function isNotificationsSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    if (result.display === 'granted') {
      await configureChannels();
    }
    return result.display === 'granted';
  }
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function getNotificationPermission(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.checkPermissions();
    return result.display;
  }
  return Notification.permission ?? 'default';
}

async function configureChannels() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Delete all old stale channels
    const oldChannels = ['kuripot_reminders_v2', 'kuripot_reminders_v3', 'kuripot_reminders_v4', 'kuripot_reminders_v5'];
    for (const id of oldChannels) {
      await LocalNotifications.deleteChannel({ id }).catch(() => {});
    }

    // Delete current channels to force recreation
    await LocalNotifications.deleteChannel({ id: 'kuripot_reminders' }).catch(() => {});
    await LocalNotifications.deleteChannel({ id: 'default' }).catch(() => {});

    // Create/update our canonical channel with full settings.
    // The native Java code in MainActivity already creates this channel
    // before Capacitor initializes, but we call it here too as a safety net.
    await LocalNotifications.createChannel({
      id: 'kuripot_reminders',
      name: 'KURIPOT Reminders',
      description: 'Finance logging reminders',
      importance: 5,
      visibility: 1,
      sound: 'kaching.ogg',
      vibration: true
    });
  } catch (e) {
    console.warn('Failed to configure notification channels', e);
  }
}

export async function scheduleReminders(reminders: Reminder[]): Promise<void> {
  // Cancel all existing scheduled reminder notifications first
  const pending = await LocalNotifications.getPending();
  const reminderIds = pending.notifications
    .filter(n => n.extra?.type === 'kuripot-reminder')
    .map(n => ({ id: n.id }));
  if (reminderIds.length > 0) {
    await LocalNotifications.cancel({ notifications: reminderIds });
  }

  const enabled = reminders.filter(r => r.enabled);
  if (enabled.length === 0) return;

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

  // Enforce channel settings on every schedule run
  await configureChannels();

  const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  let idCounter = 1000; // Start IDs at 1000 to avoid conflicts

  const now = new Date();

  for (const reminder of enabled) {
    // Schedule for the next 4 weeks for each selected day
    for (const day of reminder.days) {
      for (let week = 0; week < 4; week++) {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const target = new Date(now);

        // Days until next occurrence of this weekday
        const rawDiff = (day - now.getDay() + 7) % 7;
        // On week 0: schedule the next occurrence (today if time is future, else +7d)
        // On week 1+: add full weeks on top
        const daysToAdd = rawDiff + (week * 7);
        target.setDate(now.getDate() + daysToAdd);
        target.setHours(hours, minutes, 0, 0);

        // Skip if this time has already passed
        if (target <= now) {
          // Try adding 7 more days to get the next cycle
          target.setDate(target.getDate() + 7);
          if (target <= now) continue;
        }

        notifications.push({
          id: idCounter++,
          title: 'KURIPOT Reminder',
          body: reminder.label || 'Time to log your finances! 💰',
          schedule: { at: target },
          extra: { type: 'kuripot-reminder', reminderId: reminder.id },
          smallIcon: 'ic_stat_kuripot',
          iconColor: '#285ccc',
          channelId: 'kuripot_reminders',
          sound: 'kaching.ogg',
        });
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

const addMonths = (date: Date, months: number) => {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
};

export async function schedulePaymentPlans(plans: PaymentPlan[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const pending = await LocalNotifications.getPending();
  const existing = pending.notifications
    .filter((item) => item.extra?.type === 'payment-plan')
    .map((item) => ({ id: item.id }));
  if (existing.length > 0) {
    await LocalNotifications.cancel({ notifications: existing });
  }

  const enabled = plans.filter((plan) => plan.enabled);
  if (enabled.length === 0) return;

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

  await configureChannels();

  const now = new Date();
  const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  let idCounter = 8000;

  for (const plan of enabled) {
    const firstDue = new Date(`${plan.dueDate}T00:00:00`);
    if (Number.isNaN(firstDue.getTime())) continue;
    const lead = Math.max(0, plan.remindDaysBefore);

    for (let month = 0; month < plan.months && notifications.length < 40; month += 1) {
      const due = addMonths(firstDue, month);
      const remind = new Date(due);
      remind.setDate(remind.getDate() - lead);
      remind.setHours(9, 0, 0, 0);
      if (remind <= now) continue;

      const dueLabel = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      notifications.push({
        id: idCounter++,
        title: plan.name,
        body: lead === 0 ? `Due today, ${dueLabel}.` : `Due ${dueLabel}, in ${lead} day${lead === 1 ? '' : 's'}.`,
        schedule: { at: remind },
        extra: { type: 'payment-plan', planId: plan.id, dueDate: formatDateLocal(due) },
        smallIcon: 'ic_stat_kuripot',
        iconColor: '#285ccc',
        channelId: 'kuripot_reminders',
        sound: 'kaching.ogg',
      });
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}
