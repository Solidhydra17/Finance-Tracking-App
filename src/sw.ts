/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox precache injection point
precacheAndRoute(self.__WB_MANIFEST);

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
