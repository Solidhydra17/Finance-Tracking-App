import type { Reminder } from '@/types/reminder';

export function isNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export async function sendRemindersToSW(reminders: Reminder[]): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_REMINDERS',
        reminders,
      });
    }
  } catch (err) {
    console.warn('[Notifications] Could not send reminders to SW:', err);
  }
}
