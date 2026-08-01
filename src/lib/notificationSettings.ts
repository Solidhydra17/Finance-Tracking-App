import { registerPlugin } from '@capacitor/core';

interface NotificationSettingsPlugin {
  openChannelSettings(): Promise<void>;
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
