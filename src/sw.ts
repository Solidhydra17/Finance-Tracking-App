/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox precache injection point
precacheAndRoute(self.__WB_MANIFEST);

// ─── Declarations for Experimental APIs ───────────────────────────────────────
declare var TimestampTrigger: any;


// ─── Types ────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  label: string;
  days: number[]; // 0=Sun … 6=Sat
  time: string;   // "HH:MM"
  enabled: boolean;
}

// ─── State ────────────────────────────────────────────────────────────────────

let scheduledReminders: Reminder[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if a reminder is "due" right now (within a ±1-minute window).
 */
function isDue(reminder: Reminder): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  if (!reminder.days.includes(dayOfWeek)) return false;

  const [hh, mm] = reminder.time.split(':').map(Number);
  const dueMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Fire within a ±1-minute window
  return Math.abs(nowMinutes - dueMinutes) <= 1;
}

function showReminderNotification(reminder: Reminder) {
  const title = 'KURIPOT Reminder';
  const body = reminder.label?.trim() || 'Time to log your finances!';

  return self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `reminder-${reminder.id}`,
    renotify: true,
    data: { url: '/' },
  } as NotificationOptions);
}

function checkAndFireDueReminders() {
  for (const reminder of scheduledReminders) {
    if (reminder.enabled && isDue(reminder)) {
      showReminderNotification(reminder).catch(console.error);
    }
  }
}

/**
 * Calculates the exact next timestamp (ms) a reminder should fire.
 */
function getNextOccurrence(reminder: Reminder): number | null {
  if (!reminder.enabled || reminder.days.length === 0) return null;

  const now = new Date();
  const [hh, mm] = reminder.time.split(':').map(Number);
  
  let nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  
  // If the time has already passed today, or today is not a selected day, start looking from tomorrow
  if (nextDate.getTime() <= now.getTime() || !reminder.days.includes(nextDate.getDay())) {
    // Find the next day
    for (let i = 1; i <= 7; i++) {
      nextDate.setDate(nextDate.getDate() + 1);
      if (reminder.days.includes(nextDate.getDay())) {
        break;
      }
    }
  }

  return nextDate.getTime();
}

// ─── Message handler (receives reminders from the app) ───────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  // vite-plugin-pwa's updateServiceWorker(true) posts SKIP_WAITING
  // Without this handler the SW stays in 'waiting' state and the page never reloads
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SCHEDULE_REMINDERS') {
    scheduledReminders = (event.data.reminders as Reminder[]) || [];
    console.log(`[SW] Scheduled ${scheduledReminders.length} reminders`);

    // ─── Experimental Notification Triggers API (Android Chrome) ────────────
    // This allows scheduling notifications when the app is completely closed.
    if ('TimestampTrigger' in self) {
      for (const reminder of scheduledReminders) {
        if (!reminder.enabled) continue;
        
        const nextTime = getNextOccurrence(reminder);
        if (nextTime) {
          const title = 'KURIPOT Reminder';
          const body = reminder.label?.trim() || 'Time to log your finances!';
          
          self.registration.showNotification(title, {
            body,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: `reminder-${reminder.id}`, // Same tag overwrites previous schedule
            data: { url: '/' },
            // @ts-ignore - TS doesn't know about this experimental API yet
            showTrigger: new TimestampTrigger(nextTime)
          } as NotificationOptions).catch(console.error);
        }
      }
    }
  }
});

// ─── Fetch handler: lightweight periodic check ───────────────────────────────
// Since reliable background timers aren't possible, we piggyback on fetch events.
// Each fetch checks if any reminder is due right now.

let lastCheckMinute = -1;

self.addEventListener('fetch', () => {
  const nowMinute = Math.floor(Date.now() / 60000);
  if (nowMinute !== lastCheckMinute) {
    lastCheckMinute = nowMinute;
    checkAndFireDueReminders();
  }
});

// ─── Background Sync (fires when connectivity is restored, good wake-up hook) ─

self.addEventListener('sync', (event: unknown) => {
  const syncEvent = event as { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (syncEvent.tag === 'kuripot-reminder-check') {
    syncEvent.waitUntil(Promise.resolve(checkAndFireDueReminders()));
  }
});

// ─── Notification click: open/focus the app ──────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});
