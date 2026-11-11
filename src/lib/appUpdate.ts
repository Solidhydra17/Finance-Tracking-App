import { useEffect, useSyncExternalStore } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.31';
export const APK_DOWNLOAD_URL = 'https://github.com/Solidhydra17/Finance-Tracking-App/releases/latest/download/kuripot.apk';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const RELEASES_URL = 'https://api.github.com/repos/Solidhydra17/Finance-Tracking-App/releases/latest';

type AppUpdateSnapshot = {
  available: boolean;
  latestVersion: string | null;
};

const listeners = new Set<() => void>();
let snapshot: AppUpdateSnapshot = { available: false, latestVersion: null };
let dismissedVersion: string | null = null;
let leftApp = false;
let started = false;
let timer: number | null = null;
let checkInFlight: Promise<void> | null = null;

const isNewerVersion = (latest: string, current: string) =>
  latest.localeCompare(current, undefined, { numeric: true, sensitivity: 'base' }) > 0;

const getSnapshot = () => snapshot;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setSnapshot = (next: AppUpdateSnapshot) => {
  if (next.available === snapshot.available && next.latestVersion === snapshot.latestVersion) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const publish = (latestVersion: string | null) => {
  const newer = Boolean(latestVersion && isNewerVersion(latestVersion, APP_VERSION));
  const silenced = latestVersion != null && latestVersion === dismissedVersion;
  setSnapshot({ available: newer && !silenced, latestVersion });
};

export const checkForAppUpdate = (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (checkInFlight) return checkInFlight;

  checkInFlight = (async () => {
    try {
      const response = await fetch(RELEASES_URL);
      if (!response.ok) return;
      const data = await response.json();
      const match = String(data.name || data.tag_name || '').match(/v?(\d+\.\d+\.\d+)/);
      publish(match ? match[1] : null);
    } catch (error) {
      console.error('Failed to check for updates', error);
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
};

export const dismissAppUpdate = () => {
  dismissedVersion = snapshot.latestVersion;
  setSnapshot({ ...snapshot, available: false });
};

const startTimer = () => {
  if (timer != null) return;
  timer = window.setInterval(() => {
    void checkForAppUpdate();
  }, CHECK_INTERVAL_MS);
};

const stopTimer = () => {
  if (timer == null) return;
  window.clearInterval(timer);
  timer = null;
};

const onForeground = () => {
  if (leftApp) {
    dismissedVersion = null;
    leftApp = false;
  }
  startTimer();
  void checkForAppUpdate();
};

const onBackground = () => {
  leftApp = true;
  stopTimer();
};

export const startAppUpdateWatch = () => {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  onForeground();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onForeground();
    else onBackground();
  });

  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) onForeground();
    else onBackground();
  });
};

export const useAppUpdate = () => {
  useEffect(() => {
    startAppUpdateWatch();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
