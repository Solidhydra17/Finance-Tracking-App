import { registerPlugin } from '@capacitor/core';

interface NotificationSettingsPlugin {
  openChannelSettings(): Promise<void>;
  refreshWidget(): Promise<void>;
}

const NotificationSettings = registerPlugin<NotificationSettingsPlugin>(
  'NotificationSettings'
);

export async function openNotificationChannelSettings(): Promise<void> {
  try {
    await NotificationSettings.openChannelSettings();
  } catch (e) {
    console.warn('[NotificationSettings] openChannelSettings failed:', e);
  }
}

export async function refreshWidget(): Promise<void> {
  try {
    await NotificationSettings.refreshWidget();
  } catch (e) {
    console.warn('[Widget] refreshWidget failed:', e);
  }
}
