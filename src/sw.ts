/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ─── Workbox Precaching ───────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── SPA Navigation: NetworkFirst ────────────────────────────────────────────
// CRITICAL FIX: Use NetworkFirst instead of caches.match('/index.html').
// NetworkFirst tries the network first (gets the new index.html with new JS hashes),
// and only falls back to the cache when offline.
// The old approach always served the stale cached index.html, causing deploys
// to be invisible until the user manually cleared cache.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigations',
      networkTimeoutSeconds: 3,
    })
  )
);

// ─── Lifecycle: Install & Activate ───────────────────────────────────────────

self.addEventListener('install', () => {
  // Skip waiting immediately so the new SW activates as soon as it installs.
  // The PWAUpdateBanner already prompts the user before this point (registerType: 'prompt'),
  // so once they click "Update Now", the new SW takes over immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  // claim() makes this SW take control of all tabs immediately after activation.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Update any already-installed widgets after SW update
      (async () => {
        const widgetsApi = (self as any).widgets;
        if (!widgetsApi) return;
        const walletWidget = await widgetsApi.getByTag('kuripot-wallet-widget');
        if (walletWidget) await renderWidget(walletWidget);
        const quickWidget = await widgetsApi.getByTag('kuripot-quickadd-widget');
        if (quickWidget) await renderWidget(quickWidget);
      })()
    ]).then(() => {
      // Notify all open clients whether widgets are supported in this SW context
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'WIDGET_SUPPORT', supported: 'widgets' in self });
        });
      });
    })
  );

  // Check reminders every minute while the SW is active.
  setInterval(() => {
    checkAndFireDueReminders();
  }, 60 * 1000);
});

// ─── Declarations for Experimental APIs ──────────────────────────────────────
declare var TimestampTrigger: any;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  label: string;
  days: number[]; // 0=Sun … 6=Sat
  time: string;   // "HH:MM"
  enabled: boolean;
}

// ─── State ───────────────────────────────────────────────────────────────────

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

  const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);

  // If the time has already passed today, or today is not a selected day, start looking from tomorrow
  if (nextDate.getTime() <= now.getTime() || !reminder.days.includes(nextDate.getDay())) {
    for (let i = 1; i <= 7; i++) {
      nextDate.setDate(nextDate.getDate() + 1);
      if (reminder.days.includes(nextDate.getDay())) {
        break;
      }
    }
  }

  return nextDate.getTime();
}

// ─── Unified Message Handler ──────────────────────────────────────────────────
// All message types handled in ONE listener to avoid fragmentation.

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  // vite-plugin-pwa's updateServiceWorker(true) posts SKIP_WAITING.
  // Without this handler the SW stays in 'waiting' state and the page never reloads.
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Receive reminder schedule from the app on startup
  if (event.data?.type === 'SCHEDULE_REMINDERS') {
    scheduledReminders = (event.data.reminders as Reminder[]) || [];
    console.log(`[SW] Scheduled ${scheduledReminders.length} reminders`);

    // Run a check immediately just in case a reminder is due exactly now
    checkAndFireDueReminders();

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
            tag: `reminder-${reminder.id}`,
            data: { url: '/' },
            // @ts-ignore - TS doesn't know about this experimental API yet
            showTrigger: new TimestampTrigger(nextTime),
          } as NotificationOptions).catch(console.error);
        }
      }
    }
  }

  // Reply to CHECK_WIDGET_SUPPORT — lets the Settings page know whether
  // the Widgets API (self.widgets) exists in this SW context.
  // NOTE: self.widgets exists only in Microsoft Edge on Windows 11 (2026).
  // It does NOT exist in Chrome on any platform.
  if (event.data?.type === 'CHECK_WIDGET_SUPPORT') {
    const client = event.source as WindowClient;
    if (client) {
      client.postMessage({ type: 'WIDGET_SUPPORT', supported: 'widgets' in self });
    }
  }

  // Receive wallet data from the app and push it to the widget with correct payload
  if (event.data?.type === 'WIDGET_DATA_RESPONSE') {
    const { widgetTag, data } = event.data as {
      widgetTag: string;
      data: Record<string, unknown>;
    };
    const widgetsApi = (self as any).widgets;
    if (widgetsApi) {
      event.waitUntil((async () => {
        const widget = await widgetsApi.getByTag(widgetTag);
        if (widget) {
          const templateUrl = widget.definition?.msAcTemplate;
          const template = templateUrl
            ? await fetch(templateUrl).then((r: Response) => r.text())
            : '{"type":"AdaptiveCard","version":"1.5","body":[]}';
          await widgetsApi.updateByTag(widgetTag, {
            template,
            data: JSON.stringify(data)
          });
        }
      })());
    }
  }
});

// ─── Background Sync (fires when connectivity is restored) ───────────────────

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDGET API — experimental / progressive
// The Widgets API (self.widgets) is implemented ONLY in Microsoft Edge on Windows 11.
// It does NOT exist in Chrome on any platform.
// iOS (Safari) does not support it either.
// This implementation is progressive: the app works fully without it.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Renders a widget by fetching its Adaptive Card template and current data,
 * then calling widgets.updateByTag with both template + data.
 * The payload must include BOTH strings — data alone is not sufficient.
 */
async function renderWidget(widget: any) {
  const templateUrl = widget.definition?.msAcTemplate;
  const dataUrl = widget.definition?.data;

  if (!templateUrl) return;

  const template = await fetch(templateUrl).then((r: Response) => r.text());
  const data = dataUrl
    ? await fetch(dataUrl).then((r: Response) => r.text())
    : JSON.stringify({ totalBalance: '0.00', currency: '₱', accounts: [] });

  const widgetsApi = (self as any).widgets;
  if (widgetsApi) {
    await widgetsApi.updateByTag(widget.definition.tag, { template, data });
  }
}

self.addEventListener('widgetinstall', (event: any) => {
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener('widgetresume', (event: any) => {
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener('widgetuninstall', (_event: Event) => {
  // Nothing to clean up for now
});
