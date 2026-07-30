/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ─── Workbox Precaching ───────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── SPA Navigation: NetworkFirst ────────────────────────────────────────────
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Unified Message Handler ──────────────────────────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Receive wallet data from the app and push it to the widget
  if (event.data?.type === 'WIDGET_DATA_RESPONSE') {
    const { widgetTag, data } = event.data as {
      widgetTag: string;
      data: Record<string, unknown>;
    };
    const widgetsApi = (self as unknown as Record<string, unknown>)['widgets'];
    if (widgetsApi && typeof widgetsApi === 'object') {
      const api = widgetsApi as {
        getByTag: (tag: string) => Promise<WidgetInstance | null>;
        updateByTag: (tag: string, payload: { data: string }) => Promise<void>;
      };
      event.waitUntil(
        api.getByTag(widgetTag).then((widget) => {
          if (widget) {
            return api.updateByTag(widgetTag, { data: JSON.stringify(data) });
          }
        })
      );
    }
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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WidgetInstance {
  tag: string;
  id: string;
}

interface WidgetEvent extends ExtendableEvent {
  widget: WidgetInstance;
}

async function updateWidgetData(widget: WidgetInstance) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: 'WIDGET_DATA_REQUEST',
      widgetTag: widget.tag,
    });
  }
}

self.addEventListener('widgetinstall', (event: Event) => {
  const e = event as unknown as WidgetEvent;
  e.waitUntil(updateWidgetData(e.widget));
});

self.addEventListener('widgetresume', (event: Event) => {
  const e = event as unknown as WidgetEvent;
  e.waitUntil(updateWidgetData(e.widget));
});

self.addEventListener('widgetuninstall', (_event: Event) => {
  // Nothing to clean up for now
});
