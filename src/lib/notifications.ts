import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from '@/types/reminder';

export function isNotificationsSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
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
        });
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}
