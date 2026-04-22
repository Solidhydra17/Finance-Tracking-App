import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isCapacitor = Capacitor.isNativePlatform();

export const StorageConfig = {
  engine: isCapacitor ? 'sqlite' : 'indexeddb',
} as const;

export async function getStorageEngine() {
  if (isCapacitor) {
    const { Storable } = await import('@capacitor/sqlite');
    return new Storable();
  }
  return null;
}

export { Preferences };
