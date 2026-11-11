import React from 'react';
import { Capacitor } from '@capacitor/core';
import { APK_DOWNLOAD_URL, APP_VERSION, dismissAppUpdate, useAppUpdate } from '@/lib/appUpdate';

export const NativeUpdateBanner: React.FC = () => {
  const update = useAppUpdate();

  if (!Capacitor.isNativePlatform() || !update.available) return null;

  return (
    <div
      id="native-update-banner"
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
    >
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-midblue/10 flex items-center justify-center mt-0.5" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-midblue">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2zM3.75 14a.75.75 0 01.75.75v1.5c0 .414.336.75.75.75h9.5a.75.75 0 00.75-.75v-1.5a.75.75 0 011.5 0v1.5A2.25 2.25 0 0114.75 18h-9.5A2.25 2.25 0 013 15.75v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--text-main)]">Update available</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
              Version {update.latestVersion} is ready to install. You are on v{APP_VERSION}.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1 border-t border-[var(--card-border)]/50 mt-1">
          <button
            type="button"
            onClick={dismissAppUpdate}
            className="min-h-11 text-xs font-semibold text-[var(--text-muted)] px-4 py-2.5 rounded-xl active:scale-95"
          >
            Later
          </button>
          <a
            href={APK_DOWNLOAD_URL}
            className="min-h-11 inline-flex items-center text-xs font-bold text-white bg-midblue px-5 py-2.5 rounded-xl active:scale-95 shadow-md shadow-midblue/20"
          >
            Download update
          </a>
        </div>
      </div>
    </div>
  );
};
